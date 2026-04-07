import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: Request) {
  try {
    const { videoIds } = await request.json();
    if (!videoIds || videoIds.length === 0) return NextResponse.json({ success: false, error: '動画が選ばれていません' }, { status: 400 });

    const targetDir = path.join(process.cwd(), 'tmp_chats');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    
    // 🌟 139件などの大量IDは、テキストファイルに書き出してスクリプトに渡す！
    const targetFile = path.join(targetDir, 'targets.txt');
    fs.writeFileSync(targetFile, videoIds.join(','));

    // 🌟 古いPM2プロセス（vcrm-extractor）が残っていたら安全に削除する
    try { execSync('pm2 delete vcrm-extractor', { stdio: 'ignore' }); } catch(e) {}

    // 🌟 PM2でバックグラウンドジョブとして堂々と起動！（終わったら自動で止まる --no-autorestart 設定！）
    execSync('pm2 start npx --name "vcrm-extractor" --no-autorestart -- tsx src/scripts/extract-selected.ts', { stdio: 'ignore' });

    return NextResponse.json({ 
      success: true, 
      message: '🚀 PM2で常駐ワーカー（vcrm-extractor）を起動しました！\nサーバーで「pm2 logs vcrm-extractor」と打って監視してください！' 
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'PM2の起動に失敗しました' }, { status: 500 });
  }
}