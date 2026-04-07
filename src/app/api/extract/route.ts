import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(request: Request) {
  try {
    const { channelUrl, startDate, endDate } = await request.json();

    if (!channelUrl || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: '入力が足りません' }, { status: 400 });
    }

    // YYYY-MM-DD を yt-dlp 用の YYYYMMDD に変換
    const formatStart = startDate.replace(/-/g, '');
    const formatEnd = endDate.replace(/-/g, '');

    console.log(`\n🚀 [API] バックグラウンド抽出ジョブをキックします: ${channelUrl}`);

    // 非同期でスクリプトを起動（APIのレスポンスを待たせずに裏で走らせる！）
    const child = spawn('npx', ['tsx', 'src/scripts/extract-channel.ts', channelUrl, formatStart, formatEnd], {
      detached: true,
      stdio: 'ignore' // ログはターミナル本体の出力に任せる
    });

    child.unref(); // 親プロセスから切り離して、バックグラウンドで独立して走らせる魔法！

    return NextResponse.json({ 
      success: true, 
      message: 'バックグラウンドで全自動抽出を開始しました！ターミナルのログを確認してください。' 
    });

  } catch (error: any) {
    console.error('起動エラー:', error);
    return NextResponse.json({ success: false, error: '起動に失敗しました' }, { status: 500 });
  }
}