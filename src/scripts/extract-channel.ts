import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TMP_DIR = path.join(process.cwd(), 'tmp_chats');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const channelUrl = process.argv[2];
  const startDate = process.argv[3]; // YYYYMMDD
  const endDate = process.argv[4];   // YYYYMMDD

  if (!channelUrl || !startDate || !endDate) {
    console.error("❌ 引数が足りません！");
    process.exit(1);
  }

  console.log(`\n🚀 [V-CRM Batch] 抽出エンジン起動！`);
  console.log(`🎯 ターゲット: ${channelUrl}`);
  console.log(`📅 期間: ${startDate} 〜 ${endDate}`);

  try {
    // 1️⃣ yt-dlpの期間指定オプションを使って、対象期間の動画IDだけをぶっこ抜く！
    const listCmd = `yt-dlp --flat-playlist --print id --dateafter ${startDate} --datebefore ${endDate} "${channelUrl}"`;
    const idsRaw = execSync(listCmd, { encoding: 'utf-8' });
    const videoIds = idsRaw.split('\n').filter(id => id.trim().length === 11);

    if (videoIds.length === 0) {
      console.log(`⚠️ 指定期間内にアーカイブが見つかりませんでした。`);
      return;
    }

    console.log(`🎯 ${videoIds.length}件の対象アーカイブを発見！処理を開始します...`);

    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      console.log(`\n▶️ [${i + 1}/${videoIds.length}] 処理中: ${videoId}`);

      // 🌟 【究極の重複対策】すでにDBにあるかチェック！あれば完全スキップ！
      const existingStream = await prisma.streamEvent.findUnique({ where: { videoId } });
      if (existingStream) {
        console.log(`⏩ 既にデータベースに登録済みです。抽出をスキップします！`);
        continue;
      }

      // 2️⃣ メタデータの取得と登録
      const metaCmd = `yt-dlp --print "%(title)s|%(upload_date)s" "https://youtu.be/${videoId}"`;
      const metaRaw = execSync(metaCmd, { encoding: 'utf-8' }).trim().split('|');
      const title = metaRaw[0] || `アーカイブ (${videoId})`;
      const rawDate = metaRaw[1] || startDate;
      const publishedAt = new Date(`${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}T12:00:00Z`);

      const stream = await prisma.streamEvent.create({
        data: { videoId, title, publishedAt }
      });

      // 3️⃣ チャット抽出
      const outPath = path.join(TMP_DIR, videoId);
      const dlCmd = `yt-dlp --write-subs --sub-langs live_chat --skip-download -o "${outPath}" "https://youtu.be/${videoId}"`;
      
      try {
        execSync(dlCmd, { stdio: 'ignore' }); 
      } catch (e) {
        console.log(`⚠️ チャットがない、またはメン限のためスキップします。`);
        continue;
      }

      const jsonFile = `${outPath}.live_chat.json`;
      if (!fs.existsSync(jsonFile)) continue;

      // 4️⃣ DBインサート（前回と同じ最強ロジック）
      console.log(`📦 JSON解析＆データベース登録中...`);
      const data = fs.readFileSync(jsonFile, 'utf-8');
      const lines = data.split('\n');
      
      const viewersMap = new Map();
      const commentsToInsert: any[] = [];
      const superChatsToInsert: any[] = [];

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
            const authorId = renderer.authorExternalChannelId;
            const authorName = renderer.authorName?.simpleText || "匿名リスナー";
            const iconUrl = renderer.authorPhoto?.thumbnails?.[0]?.url || "";
            if (authorId && !viewersMap.has(authorId)) viewersMap.set(authorId, { youtubeId: authorId, name: authorName, iconUrl });
            const timeText = renderer.timestampText?.simpleText || "0:00";
            const message = renderer.message?.runs?.map((r: any) => r.text).join('') || "";

            if (textRenderer) commentsToInsert.push({ viewerId: authorId, streamId: stream.id, message, timestampText: timeText });
            if (paidRenderer) {
              const amountStr = paidRenderer.purchaseAmountText?.simpleText || "￥0";
              const numericAmount = parseFloat(amountStr.replace(/[^\d.]/g, '')) || 0;
              superChatsToInsert.push({ viewerId: authorId, streamId: stream.id, amount: numericAmount, currency: amountStr.includes('￥') ? 'JPY' : 'OTHER', message });
            }
          }
        } catch (e) {}
      }

      const existingViewers = await prisma.viewer.findMany({ where: { youtubeId: { in: Array.from(viewersMap.keys()) } }, select: { youtubeId: true } });
      const existingYoutubeIds = new Set(existingViewers.map(v => v.youtubeId));
      const newViewers = Array.from(viewersMap.values()).filter(v => !existingYoutubeIds.has(v.youtubeId));

      if (newViewers.length > 0) await prisma.viewer.createMany({ data: newViewers });
      const dbViewers = await prisma.viewer.findMany({ where: { youtubeId: { in: Array.from(viewersMap.keys()) } } });
      const dbViewerMap = new Map(dbViewers.map(v => [v.youtubeId, v.id]));

      const validComments = commentsToInsert.filter(c => dbViewerMap.has(c.viewerId)).map(c => ({ ...c, viewerId: dbViewerMap.get(c.viewerId)! }));
      if (validComments.length > 0) await prisma.comment.createMany({ data: validComments });

      const validSuperChats = superChatsToInsert.filter(s => dbViewerMap.has(s.viewerId)).map(s => ({ ...s, viewerId: dbViewerMap.get(s.viewerId)! }));
      if (validSuperChats.length > 0) await prisma.superChat.createMany({ data: validSuperChats });

      console.log(`✅ 登録完了！ 新規: ${newViewers.length}人 / コメ: ${validComments.length}件 / スパチャ: ${validSuperChats.length}件`);
      fs.unlinkSync(jsonFile);
      await sleep(3000); // 連続アクセス防止
    }
    console.log(`\n🎉🎉 全ての処理が完了しました！`);
  } catch (error) {
    console.error("❌ エラー発生:", error);
  } finally {
    await prisma.$disconnect();
  }
}
main();