import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  const titleParam = searchParams.get('title') || 'salvage_video';

  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'ファイルが見つからないよ！' }, { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);

    // 🌟 日本語や絵文字のタイトルでも文字化けせずにダウンロードさせる最強の魔法！
    const safeTitle = encodeURIComponent(titleParam) + '.mp4';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        // ブラウザに元のタイトル名で保存させる！
        'Content-Disposition': `attachment; filename*=UTF-8''${safeTitle}`,
      },
    });
  } catch (error) {
    console.error('ダウンロード中にエラー:', error);
    return NextResponse.json({ error: 'ダウンロード処理に失敗...' }, { status: 500 });
  }
}