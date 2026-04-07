import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { prisma } from '@/lib/prisma'; // 🌟 データベースを召喚！

export async function POST(request: Request) {
  try {
    const { channelUrl, startDate, endDate } = await request.json();
    if (!channelUrl || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: '入力が足りません' }, { status: 400 });
    }

    const startNum = parseInt(startDate.replace(/-/g, ''), 10);
    const endNum = parseInt(endDate.replace(/-/g, ''), 10);

    console.log(`\n📋 [API] 動画リストを取得します: ${channelUrl}`);

    const cmd = `yt-dlp --flat-playlist --playlist-end 150 --print "%(id)s@@@%(title)s@@@%(upload_date)s@@@%(live_status)s" "${channelUrl}"`;
    const rawOutput = execSync(cmd, { encoding: 'utf-8' });
    
    let videos = rawOutput.split('\n').filter(line => line.trim() !== '').map(line => {
      const parts = line.split('@@@');
      const id = parts[0];
      const title = parts[1] || `アーカイブ (${id})`;
      const rawDate = parts[2];
      const liveStatus = parts[3]?.trim();
      
      let dateNum = 0;
      let formattedDate = '日付不明';

      if (rawDate && rawDate !== 'NA' && rawDate !== 'None') {
        dateNum = parseInt(rawDate, 10);
        formattedDate = `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}`;
      }

      return { id, title, date: formattedDate, dateNum, liveStatus };
    })
    .filter(v => {
      if (v.liveStatus === 'is_live' || v.liveStatus === 'is_upcoming') return false;
      if (v.dateNum > 0 && (v.dateNum < startNum || v.dateNum > endNum)) return false;
      return true;
    });

    // 🌟 【最強機能】データベースと照合して「抽出済み」フラグをつける！
    const videoIds = videos.map(v => v.id);
    const existingStreams = await prisma.streamEvent.findMany({
      where: { videoId: { in: videoIds } },
      select: { videoId: true }
    });
    // すでにDBにある動画IDのセット（辞書）を作成
    const existingSet = new Set(existingStreams.map(s => s.videoId));

    const finalVideos = videos.map(v => ({
      ...v,
      isExtracted: existingSet.has(v.id) // DBにあったら true！
    }));

    console.log(`🎯 フィルター通過: ${finalVideos.length}件のアーカイブを発見！`);

    return NextResponse.json({ success: true, videos: finalVideos });
  } catch (error: any) {
    console.error('リスト取得エラー:', error);
    return NextResponse.json({ success: false, error: '取得失敗。URLを確認してください。' }, { status: 500 });
  }
}