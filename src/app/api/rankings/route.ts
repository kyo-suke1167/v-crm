// app/api/rankings/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrencyCaseSql } from '@/lib/exchange';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { startDate, endDate } = await request.json();
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);

    // 1️⃣ 期間内の配信数をカウント
    const totalStreams = await prisma.streamEvent.count({
      where: { publishedAt: { gte: start, lte: end } }
    });

    if (totalStreams === 0) {
      return NextResponse.json({ 
        success: true, 
        topSpachas: [], 
        topAttendance: [], 
        topComments: [], 
        totalStreams: 0, 
        allStreams: [], 
        periodTotalAmount: 0,
        totalActiveListeners: 0 
      });
    }

    // 2️⃣ 最新の為替レートSQLスニペットを生成
    const dynamicCurrencySql = await getCurrencyCaseSql();

    // 🌟 3️⃣ 5つの重い集計処理を完全並列で実行！
    // 修正ポイント：左側の変数リストに「totalActiveRaw」を追加したわよ！
    const [topSpachasRaw, topAttendanceRaw, topCommentsRaw, totalAmountRaw, totalActiveRaw] = await Promise.all([
      
      // ① スパチャ王
      prisma.$queryRaw`
        SELECT v.id as viewerId, v.name, v.iconUrl, 
          CAST(SUM(${dynamicCurrencySql}) AS INTEGER) as totalAmount
        FROM SuperChat s
        JOIN Viewer v ON s.viewerId = v.id
        JOIN StreamEvent e ON s.streamId = e.id
        WHERE e.publishedAt >= ${start} AND e.publishedAt <= ${end}
        GROUP BY v.id
        ORDER BY totalAmount DESC
        LIMIT 100;
      `,

      // ② 出席率王
      prisma.$queryRaw`
        SELECT v.id as viewerId, v.name, v.iconUrl, CAST(COUNT(DISTINCT c.streamId) AS INTEGER) as count
        FROM Comment c
        JOIN Viewer v ON c.viewerId = v.id
        JOIN StreamEvent e ON c.streamId = e.id
        WHERE e.publishedAt >= ${start} AND e.publishedAt <= ${end}
        GROUP BY v.id
        ORDER BY count DESC
        LIMIT 100;
      `,

      // ③ コメント王
      prisma.$queryRaw`
        SELECT v.id as viewerId, v.name, v.iconUrl, CAST(COUNT(c.id) AS INTEGER) as count
        FROM Comment c
        JOIN Viewer v ON c.viewerId = v.id
        JOIN StreamEvent e ON c.streamId = e.id
        WHERE e.publishedAt >= ${start} AND e.publishedAt <= ${end}
        GROUP BY v.id
        ORDER BY count DESC
        LIMIT 100;
      `,

      // ④ 期間内の全スパチャ総額
      prisma.$queryRaw`
        SELECT CAST(SUM(${dynamicCurrencySql}) AS INTEGER) as total
        FROM SuperChat s
        JOIN StreamEvent e ON s.streamId = e.id
        WHERE e.publishedAt >= ${start} AND e.publishedAt <= ${end};
      `,

      // ⑤ 期間内にコメントした「全アクティブリスナー数」
      prisma.$queryRaw`
        SELECT CAST(COUNT(DISTINCT c.viewerId) AS INTEGER) as totalActive
        FROM Comment c
        JOIN StreamEvent e ON c.streamId = e.id
        WHERE e.publishedAt >= ${start} AND e.publishedAt <= ${end};
      `
    ]);

    // 欠席判定用の詳細取得
    const topAttendanceViewerIds = (topAttendanceRaw as any[]).map(user => user.viewerId);
    
    const attendanceDetails = await prisma.comment.findMany({
      where: {
        viewerId: { in: topAttendanceViewerIds },
        stream: { publishedAt: { gte: start, lte: end } }
      },
      select: { viewerId: true, streamId: true },
      distinct: ['viewerId', 'streamId']
    });

    const attendedMap = new Map<string, Set<string>>();
    for (const detail of attendanceDetails) {
      if (!attendedMap.has(detail.viewerId)) attendedMap.set(detail.viewerId, new Set());
      attendedMap.get(detail.viewerId)!.add(detail.streamId);
    }

    // 配信リストの取得
    const allStreams = await prisma.streamEvent.findMany({
      where: { publishedAt: { gte: start, lte: end } },
      orderBy: { publishedAt: 'desc' },
      select: { id: true, videoId: true, title: true, publishedAt: true },
      take: 2000
    });

    const formatUser = (u: any) => ({ viewerId: u.viewerId, name: u.name || "匿名", iconUrl: u.iconUrl || "" });

    return NextResponse.json({
      success: true,
      topSpachas: (topSpachasRaw as any[]).map(s => ({ ...formatUser(s), totalAmount: Number(s.totalAmount || 0) })),
      topAttendance: (topAttendanceRaw as any[]).map(user => ({ ...formatUser(user), count: Number(user.count || 0), attendedStreamIds: Array.from(attendedMap.get(user.viewerId) || []) })),
      topComments: (topCommentsRaw as any[]).map(c => ({ ...formatUser(c), count: Number(c.count || 0) })),
      totalStreams,
      allStreams,
      periodTotalAmount: Number((totalAmountRaw as any)[0]?.total || 0),
      // 🌟 修正：totalActiveRaw を使うように変更！
      totalActiveListeners: Number((totalActiveRaw as any)[0]?.totalActive || 0)
    });

  } catch (error: any) {
    console.error("ランキング集計エラー:", error);
    return NextResponse.json({ success: false, error: '処理に失敗しました。' }, { status: 500 });
  }
}