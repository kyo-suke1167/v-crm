import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const { fileName, data } = await request.json();

    console.log(`\n📦 [V-CRM] データ解析開始: ${fileName}`);

    // 1️⃣ 配信イベントの作成（ファイル名からVideoIDを推測）
    const videoIdMatch = fileName.match(/([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : `unknown_${Date.now()}`;

    // すでに同じ配信が登録されていたら使い回す（Upsert）
    const stream = await prisma.streamEvent.upsert({
      where: { videoId },
      update: {},
      create: {
        videoId,
        title: `アーカイブ配信 (${videoId})`,
        publishedAt: new Date(), // ※本当はYouTube APIで取得すべきだけど今回はインポート日で代用
      }
    });

    // 2️⃣ データをパースして仕分けするためのバケツを用意
    const viewersMap = new Map(); // 重複防止用のリスナーリスト
    const commentsToInsert: any[] = [];
    const superChatsToInsert: any[] = [];

    const lines = data.split('\n');
    let parsedCount = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        const item = parsed?.replayChatItemAction?.actions?.[0]?.addChatItemAction?.item || parsed?.addChatItemAction?.item;
        if (!item) continue;

        const textRenderer = item?.liveChatTextMessageRenderer;
        const paidRenderer = item?.liveChatPaidMessageRenderer;
        const renderer = textRenderer || paidRenderer;

        if (renderer) {
          // リスナー情報の抽出（ここが超重要！YouTubeの内部IDで同一人物を特定するわ！）
          const authorId = renderer.authorExternalChannelId;
          const authorName = renderer.authorName?.simpleText || "匿名リスナー";
          const iconUrl = renderer.authorPhoto?.thumbnails?.[0]?.url || "";

          if (authorId && !viewersMap.has(authorId)) {
            viewersMap.set(authorId, { youtubeId: authorId, name: authorName, iconUrl });
          }

          const timeText = renderer.timestampText?.simpleText || "0:00";
          const message = renderer.message?.runs?.map((r: any) => r.text).join('') || "";

          // 💬 コメントの仕分け
          if (textRenderer) {
            commentsToInsert.push({
              viewerId: authorId,
              streamId: stream.id,
              message: message || "（スタンプ等）",
              timestampText: timeText,
            });
          }

          // 💸 スパチャの仕分け
          if (paidRenderer) {
            const amountStr = paidRenderer.purchaseAmountText?.simpleText || "￥0";
            const numericAmount = parseFloat(amountStr.replace(/[^\d.]/g, '')) || 0;
            
            superChatsToInsert.push({
              viewerId: authorId,
              streamId: stream.id,
              amount: numericAmount,
              currency: amountStr.includes('￥') ? 'JPY' : 'OTHER',
              message: message,
            });
          }
          parsedCount++;
        }
      } catch (e) {
        // パースエラーは無視して次へ（JSONLの仕様上よくあることよ）
      }
    }

    console.log(`📊 解析完了: 有効なアクション ${parsedCount} 件 / 新規リスナー候補 ${viewersMap.size} 人`);

    // 3️⃣ データベースへの怒涛の書き込み（バルクインサートで爆速化！）
    
    // 🌟 修正ポイント：DBにすでにいるリスナーを先に調べて、新規だけを抽出する超安全設計！
    const existingViewers = await prisma.viewer.findMany({
        where: { youtubeId: { in: Array.from(viewersMap.keys()) } },
        select: { youtubeId: true }
      });
      const existingYoutubeIds = new Set(existingViewers.map(v => v.youtubeId));
  
      // まだDBにいない「完全新規のリスナー」だけをフィルター！
      const newViewers = Array.from(viewersMap.values()).filter(v => !existingYoutubeIds.has(v.youtubeId));
  
      if (newViewers.length > 0) {
        await prisma.viewer.createMany({
          data: newViewers,
          // これでもう重複エラーは絶対に起きないわ！
        });
      }
  
      // データベース側で採番された本当の Viewer ID を取得して紐付け直すための辞書作成
      const dbViewers = await prisma.viewer.findMany({
        where: { youtubeId: { in: Array.from(viewersMap.keys()) } }
      });
      const dbViewerMap = new Map(dbViewers.map(v => [v.youtubeId, v.id]));
  
      // コメントの登録
      const validComments = commentsToInsert
        .filter(c => dbViewerMap.has(c.viewerId))
        .map(c => ({ ...c, viewerId: dbViewerMap.get(c.viewerId)! }));
      
      if (validComments.length > 0) {
        await prisma.comment.createMany({ data: validComments });
      }
  
      // スパチャの登録
      const validSuperChats = superChatsToInsert
        .filter(s => dbViewerMap.has(s.viewerId))
        .map(s => ({ ...s, viewerId: dbViewerMap.get(s.viewerId)! }));
  
      if (validSuperChats.length > 0) {
        await prisma.superChat.createMany({ data: validSuperChats });
      }
  
      return NextResponse.json({ 
        success: true, 
        message: `【インポート成功】新規リスナー: ${newViewers.length}人 / コメント: ${validComments.length}件 / スパチャ: ${validSuperChats.length}件 を記録したわ！` 
      });
  
    } catch (error: any) {
      console.error('インポートエラー:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }