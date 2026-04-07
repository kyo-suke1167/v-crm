"use client";
import React, { useState } from "react";
import Link from "next/link";

export default function YouTubeSalvage() {
  const [url, setUrl] = useState("");
  
  // 状態管理
  const [isExtracting, setIsExtracting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);

  // 🎬 動画サルベージの処理
  const handleExtractVideo = async () => {
    if (!url) return;
    setIsExtracting(true);
    setDownloadUrl(null);
    setVideoTitle(null);

    try {
      const res = await fetch('/api/extract-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await res.json();
      
      if (data.success) {
        const encodedPath = encodeURIComponent(data.filePath);
        const encodedTitle = encodeURIComponent(data.title);
        
        setDownloadUrl(`/api/download-video?path=${encodedPath}&title=${encodedTitle}`);
        setVideoTitle(data.title);
      } else {
        alert('❌ 抽出エラー: ' + data.error);
      }
    } catch (error) {
      alert('❌ サーバー通信エラーが発生！');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans p-8 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* 🌟 メインページと完全に合わせたヘッダー */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-indigo-900 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 tracking-wider flex items-center gap-3">
              🎬 YouTube Salvage
              <span className="text-xs font-black text-white bg-red-600 px-2 py-1 rounded tracking-normal">V-CRM</span>
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              Youtube動画をSerenサーバー経由で安全にサルベージ！！
            </p>
          </div>

          {/* メインダッシュボードへ戻るリンク（UIを統一） */}
          <Link
            href="/"
            className="group flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all border border-transparent hover:border-gray-700 relative overflow-hidden"
          >
            <svg
              className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span className="font-bold tracking-wide">ダッシュボードへ戻る</span>
          </Link>
        </header>

        {/* 🌟 サルベージ機能のメインパネル（スマートマイニングパネルのUIを継承） */}
        <section className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 shadow-2xl">

          <div className="space-y-6 max-w-4xl">
            {/* URL入力エリア */}
            <div>
              <label className="block text-sm text-gray-400 mb-2 font-bold" htmlFor="youtubeUrl">
                サルベージ対象のYouTube URL
              </label>
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  id="youtubeUrl"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="例: https://www.youtube.com/watch?v=..."
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                />
                <button
                  onClick={handleExtractVideo}
                  disabled={isExtracting || !url}
                  className="w-full md:w-auto md:min-w-[280px] bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>{isExtracting ? '抽出＆変換中...' : '動画をサルベージ'}</span>
                </button>
              </div>
            </div>

            {/* プログレスバー風の装飾（抽出中のみ表示） */}
            {isExtracting && (
              <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 animate-pulse w-full"></div>
              </div>
            )}
          </div>
        </section>

        {/* 🌟 サルベージ完了時のダウンロードエリア */}
        {downloadUrl && (
          <section className="bg-gray-900 border border-green-900/50 rounded-2xl p-8 shadow-2xl animate-fade-in-up">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              
              <div className="flex-1 w-full">
                <h3 className="text-green-400 font-bold text-xl mb-2 flex items-center gap-2">
                  サルベージ完了！
                </h3>
                <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 mb-2">
                  <p className="text-gray-500 text-xs mb-1 font-bold">抽出された動画タイトル</p>
                  <p className="text-gray-200 font-medium truncate" title={videoTitle || ''}>
                    {videoTitle}
                  </p>
                </div>
                <p className="text-gray-500 text-xs font-mono tracking-wider">
                  Saved to: DeskMini X600 /mnt/hdd_backup
                </p>
              </div>

              <a
                href={downloadUrl}
                download
                className="w-full md:w-auto bg-green-700 hover:bg-green-600 border border-green-500/50 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg text-center tracking-widest whitespace-nowrap flex items-center justify-center gap-2"
              >
                MP4をダウンロード
              </a>
              
            </div>
          </section>
        )}

      </div>
    </div>
  );
}