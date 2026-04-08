// app/api/rates/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const RATES_FILE = path.join(process.cwd(), 'rates.json');
    
    // ファイルが存在すれば、中身と更新日時を返す
    if (fs.existsSync(RATES_FILE)) {
      const stat = fs.statSync(RATES_FILE);
      const rates = JSON.parse(fs.readFileSync(RATES_FILE, 'utf-8'));
      
      return NextResponse.json({
        success: true,
        rates,
        lastUpdated: stat.mtime // 🌟 最後にAPIから取得した時間！
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'レートデータがまだありません。一度検索を実行してください。' 
      });
    }
  } catch (error) {
    console.error("Rates API Error:", error);
    return NextResponse.json({ success: false, error: 'レートの取得に失敗しました' }, { status: 500 });
  }
}