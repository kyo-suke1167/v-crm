import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = util.promisify(exec);

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URLが空！やり直し！' }, { status: 400 });
    }

    const cleanUrl = url.split('?')[0];

    let videoTitle = 'salvage_video';
    try {
      // 🌟 修正1：タイトル取得時にも --js-runtimes node を追加！
      const { stdout } = await execAsync(`yt-dlp --js-runtimes node --get-title "${cleanUrl}"`, { maxBuffer: 10 * 1024 * 1024 });
      videoTitle = stdout.trim() || 'salvage_video';
    } catch (e) {
      console.warn('タイトルの取得に失敗したからデフォルト名を使うよ');
    }

    const outputDir = '/mnt/hdd_backup/video_archive';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = Date.now();
    const videoFile = path.join(outputDir, `salvage_video_${timestamp}.mp4`);

    console.log(`🎬 yt-dlpで動画を抽出中... ターゲット: ${cleanUrl}`);

    // 🌟 修正2：動画ダウンロード時にも --js-runtimes node を追加してJSパズルを解かせる！
    const ytdlpCommand = `yt-dlp --js-runtimes node --no-progress -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${videoFile}" "${cleanUrl}"`;
    
    await execAsync(ytdlpCommand, { maxBuffer: 10 * 1024 * 1024 });

    console.log(`✅ 動画の抽出完了！ 保存先: ${videoFile}`);

    return NextResponse.json({ 
      success: true, 
      message: '動画ファイルの錬成に成功！',
      filePath: videoFile,
      title: videoTitle
    });

  } catch (error: any) {
    console.error('❌ 処理中にエラーが発生:', error.message);
    return NextResponse.json({ error: `抽出失敗: ${error.message}` }, { status: 500 });
  }
}