import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // クローラーが書き込む進捗ファイルを読みに行くわ！
    const progressFile = path.join(process.cwd(), 'progress.json');
    
    if (!fs.existsSync(progressFile)) {
      return NextResponse.json({ isRunning: false, current: 0, total: 0, currentTitle: '待機中...' });
    }
    
    const data = fs.readFileSync(progressFile, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ isRunning: false, current: 0, total: 0, currentTitle: 'エラー' });
  }
}