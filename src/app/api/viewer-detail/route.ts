import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrencyCaseSql } from '@/lib/exchange';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { viewerId } = await req.json();
    const dynamicCurrencySql = await getCurrencyCaseSql(); 

    // 🌟 【追加】現在の為替レートを読み込む（証拠の計算式用）
    let rates: Record<string, number> = {};
    try {
      const ratesPath = path.join(process.cwd(), 'rates.json');
      if (fs.existsSync(ratesPath)) {
        rates = JSON.parse(fs.readFileSync(ratesPath, 'utf-8'));
      }
    } catch (e) {
      console.warn("レート読み込みエラー", e);
    }

    // 1. 初見配信
    const firstComment = await prisma.comment.findFirst({
      where: { viewerId },
      orderBy: { stream: { publishedAt: 'asc' } },
      include: { stream: true }
    });

    // 2. 累計スパチャ額（日本円換算）
    const spachaRaw = await prisma.$queryRaw`
      SELECT CAST(SUM(${dynamicCurrencySql}) AS INTEGER) as total
      FROM SuperChat s WHERE s.viewerId = ${viewerId}
    `;
    const totalSpacha = (spachaRaw as any)[0]?.total ? Number((spachaRaw as any)[0].total) : 0;

    // 🌟 3. 生データ（通貨）ごとの内訳と、フロント用のレート計算
    const breakdown = await prisma.superChat.groupBy({
      by: ['rawSymbol', 'currency'],
      where: { viewerId },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } }
    });
    
    const currencyBreakdown = breakdown.map(b => {
      // ※APIのレートは「1円 = 〇〇ドル」の形式(例: USD=0.0065)なので、
      // フロントエンドの「ドル × 〇〇 = 円」の計算式用に逆数(1 / rate)にして渡すわ！
      const rawRate = rates[b.currency];
      const multiplier = rawRate ? (1 / rawRate) : 1; 

      return {
        rawSymbol: b.rawSymbol,
        currency: b.currency,
        totalAmount: b._sum.amount || 0,
        rate: multiplier
      };
    });

    // 4. 累計コメント数
    const totalComments = await prisma.comment.count({ where: { viewerId } });

    // 5. 参加したユニークな枠数（出席数）
    const attendedStreams = await prisma.comment.findMany({
      where: { viewerId },
      select: { streamId: true },
      distinct: ['streamId']
    });
    const attendedCount = attendedStreams.length;

    // 6. 全配信の総数（分母）
    const totalStreams = await prisma.streamEvent.count();

    return NextResponse.json({
      success: true,
      firstStream: firstComment?.stream || null,
      totalSpacha,
      currencyBreakdown, // 🌟 フロントエンドに計算式用のデータを送る！
      totalComments,
      attendedCount,
      totalStreams
    });

  } catch (error) {
    console.error("Viewer Detail Error:", error);
    return NextResponse.json({ success: false, error: "詳細の取得に失敗しました" }, { status: 500 });
  }
}