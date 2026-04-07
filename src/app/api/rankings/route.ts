import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 💱 魔法の辞書：固定為替レート（ベースはJPY=1）
// ※ゆくゆくは外部APIで当日のレートを取得してここに当てはめれば完璧よ！
const EXCHANGE_RATES: Record<string, number> = {
  'JPY': 1,
  'USD': 150.0,
  'TWD': 4.7,   // 台湾ドル
  'KRW': 0.11,  // 韓国ウォン
  'EUR': 160.0,
  'HKD': 19.0,  // 香港ドル
  'GBP': 190.0, // 🇬🇧 追加：イギリス・ポンド
  'PHP': 2.6,   // 🇵🇭 追加：フィリピン・ペソ
};

export async function POST(request: Request) {
  try {
    const { startDate, endDate } = await request.json();
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);

    // 1️⃣ 期間内の「全配信リスト」を取得（欠席判定のためにフロントに送る！）
    const allStreams = await prisma.streamEvent.findMany({
      where: { publishedAt: { gte: start, lte: end } },
      orderBy: { publishedAt: 'asc' },
      select: { id: true, videoId: true, title: true, publishedAt: true }
    });

    const streamIds = allStreams.map(s => s.id);
    const totalStreams = streamIds.length;

    if (totalStreams === 0) {
      return NextResponse.json({ success: true, topSpachas: [], topAttendance: [], totalStreams: 0, allStreams: [] });
    }

    // 2️⃣ スパチャ集計（為替レート変換対応エンジン）
    const superChats = await prisma.superChat.findMany({
      where: { streamId: { in: streamIds } },
      include: { viewer: true }
    });

    const spachaMap = new Map<string, any>();
    for (const sc of superChats) {
      const vId = sc.viewerId;
      if (!spachaMap.has(vId)) {
        spachaMap.set(vId, { name: sc.viewer.name, iconUrl: sc.viewer.iconUrl, totalAmount: 0 });
      }
      const user = spachaMap.get(vId);
      
      // 💱 データベースのcurrencyを見てレート計算（無い場合は1倍のJPY扱い）
      const rate = EXCHANGE_RATES[sc.currency || 'JPY'] || 1; 
      user.totalAmount += sc.amount * rate;
    }

    const topSpachas = Array.from(spachaMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 100)
      .map(v => ({ ...v, totalAmount: Math.floor(v.totalAmount) })); // 日本円なので小数点切り捨て！

    // 3️⃣ 出席率集計（誰がどの「枠ID」にコメントしたかを記録する）
    const comments = await prisma.comment.findMany({
      where: { streamId: { in: streamIds } },
      select: { viewerId: true, streamId: true, viewer: { select: { name: true, iconUrl: true } } }
    });

    const attendanceMap = new Map<string, { name: string, iconUrl: string, attendedStreamIds: Set<string> }>();
    for (const c of comments) {
        if (!attendanceMap.has(c.viewerId)) {
          // 🌟 ?. と || "" を使って「もしデータが無くても絶対に文字列にする」魔法！
          attendanceMap.set(c.viewerId, { 
            name: c.viewer?.name || "匿名", 
            iconUrl: c.viewer?.iconUrl || "", 
            attendedStreamIds: new Set() 
          });
        }
        attendanceMap.get(c.viewerId)!.attendedStreamIds.add(c.streamId);
      }

    const topAttendance = Array.from(attendanceMap.values())
      .map(v => ({
        name: v.name,
        iconUrl: v.iconUrl,
        count: v.attendedStreamIds.size,
        attendedStreamIds: Array.from(v.attendedStreamIds) // Setを配列に戻してフロントへ送る
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    return NextResponse.json({
      success: true,
      topSpachas,
      topAttendance,
      totalStreams,
      allStreams // 🌟 これが欠席リストの割り出しに必須のデータよ！
    });

  } catch (error) {
    console.error("ランキング集計エラー:", error);
    return NextResponse.json({ success: false, error: '集計に失敗しました' }, { status: 500 });
  }
}