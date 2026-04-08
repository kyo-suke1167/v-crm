// app/api/viewer-detail/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrencyCaseSql } from '@/lib/exchange';

export async function POST(req: Request) {
  try {
    const { viewerId } = await req.json();
    const dynamicCurrencySql = await getCurrencyCaseSql(); 

    // 1. 初見配信
    const firstComment = await prisma.comment.findFirst({
      where: { viewerId },
      orderBy: { stream: { publishedAt: 'asc' } },
      include: { stream: true }
    });

    // 2. 累計スパチャ額
    const spachaRaw = await prisma.$queryRaw`
      SELECT CAST(SUM(${dynamicCurrencySql}) AS INTEGER) as total
      FROM SuperChat s WHERE s.viewerId = ${viewerId}
    `;
    const totalSpacha = (spachaRaw as any)[0]?.total ? Number((spachaRaw as any)[0].total) : 0;

    // 3. 累計コメント数
    const totalComments = await prisma.comment.count({ where: { viewerId } });

    // 🌟 4. 【追加】参加したユニークな枠数（出席数）
    const attendedStreams = await prisma.comment.findMany({
      where: { viewerId },
      select: { streamId: true },
      distinct: ['streamId']
    });
    const attendedCount = attendedStreams.length;

    // 🌟 5. 【追加】全配信の総数（分母）
    const totalStreams = await prisma.streamEvent.count();

    return NextResponse.json({
      success: true,
      firstStream: firstComment?.stream || null,
      totalSpacha,
      totalComments,
      attendedCount, // 🌟 追加してフロントへ送る！
      totalStreams   // 🌟 追加してフロントへ送る！
    });

  } catch (error) {
    console.error("Viewer Detail Error:", error);
    return NextResponse.json({ success: false, error: "詳細の取得に失敗しました" }, { status: 500 });
  }
}