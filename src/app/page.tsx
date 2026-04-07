"use client";
import React, { useState, useEffect } from "react";
import Link from 'next/link';

// 新しいデータ構造の型定義
type Stream = {
  id: string;
  videoId: string;
  title: string;
  publishedAt: string;
};
type RankingData = {
  topSpachas: any[];
  topAttendance: any[];
  totalStreams: number;
  allStreams: Stream[];
};

export default function VcrmDashboard() {
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");
  const [isSearching, setIsSearching] = useState(false);
  const [rankings, setRankings] = useState<RankingData | null>(null);

  // 🌟 欠席リストのアコーディオン（展開）状態を管理するState
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const [progress, setProgress] = useState({
    isRunning: false,
    current: 0,
    total: 0,
    currentTitle: "待機中..."
  });

  // 🌟 追加：3秒ごとに自動でAPIを叩いて進捗を更新する魔法陣！
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/progress');
        const data = await res.json();
        setProgress(data);
      } catch (e) {
        // エラー時は何もしない
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const [fetchedVideos, setFetchedVideos] = useState<
    { id: string; title: string; date: string; isExtracted?: boolean }[]
  >([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(
    new Set(),
  );
  const [isFetchingList, setIsFetchingList] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    setExpandedUser(null); // 検索し直したら展開状態をリセット
    try {
      const res = await fetch("/api/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });
      const data = await res.json();
      if (data.success) setRankings(data);
    } catch (e) {
      alert("エラーが発生しました");
    } finally {
      setIsSearching(false);
    }
  };

  const fetchVideoList = async () => {
    /* 省略せずにそのまま残す */
    const channelUrl = (
      document.getElementById("extractUrl") as HTMLInputElement
    ).value;
    const extStart = (document.getElementById("extStart") as HTMLInputElement)
      .value;
    const extEnd = (document.getElementById("extEnd") as HTMLInputElement)
      .value;
    if (!channelUrl) return alert("URLを入力してください！");
    setIsFetchingList(true);
    try {
      const res = await fetch("/api/fetch-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelUrl,
          startDate: extStart,
          endDate: extEnd,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFetchedVideos(data.videos);
        const defaultChecked = data.videos
          .filter((v: any) => !v.isExtracted)
          .map((v: any) => v.id);
        setSelectedVideoIds(new Set(defaultChecked));
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("エラー");
    }
    setIsFetchingList(false);
  };

  const extractSelected = async () => {
    /* 省略せずにそのまま残す */
    if (selectedVideoIds.size === 0) return alert("動画を選んでください！");
    try {
      const res = await fetch("/api/extract-selected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoIds: Array.from(selectedVideoIds) }),
      });
      const data = await res.json();
      alert(data.message);
    } catch (e) {
      alert("エラー");
    }
  };

  const toggleSelection = (id: string) => {
    /* 省略せずにそのまま残す */
    const newSet = new Set(selectedVideoIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedVideoIds(newSet);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans p-8 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b border-indigo-900 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-wider">
              👑 V-CRM Analyzer
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              リスナー貢献度・エンゲージメント可視化システム
            </p>
            <Link 
    href="/analyzer" // ※さっき作ったページのURLに合わせてね（例: /analyzer）
    className="group flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all border border-transparent hover:border-gray-700 relative overflow-hidden"
  >
    {/* 左側のキラキラアイコン（SVG） */}
    <svg className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>

    {/* メニュー名 */}
    <span className="font-bold tracking-wide">YouTube SEO分析</span>

    {/* クライアントを釣るための「NEW」バッジ（アニメーション付き） */}
    <span className="ml-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)] animate-pulse">
      NEW
    </span>
  </Link>
          </div>

          {/* 🌟 ここが追加した「為替レート表示パネル」よ！ */}
          <div className="bg-gray-900/80 border border-gray-700 p-3 rounded-xl shadow-md text-xs text-gray-300 flex flex-wrap gap-4 items-center">
            <span className="font-bold text-indigo-400 tracking-wider">
              適用中の固定換算レート
            </span>
            <div className="flex flex-wrap gap-3 border-l border-gray-700 pl-3">
              <span>
                🇺🇸 USD: <span className="text-yellow-400">¥150</span>
              </span>
              <span>
                🇹🇼 TWD: <span className="text-yellow-400">¥4.7</span>
              </span>
              <span>
                🇰🇷 KRW: <span className="text-yellow-400">¥0.11</span>
              </span>
              <span>
                🇪🇺 EUR: <span className="text-yellow-400">¥160</span>
              </span>
              <span>
                🇭🇰 HKD: <span className="text-yellow-400">¥19</span>
              </span>
              <span>
                🇬🇧 GBP: <span className="text-yellow-400">¥190</span>
              </span>
              <span>
                🇵🇭 PHP: <span className="text-yellow-400">¥2.6</span>
              </span>
            </div>
          </div>
        </header>

        <section className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-gray-300">検索期間:</h2>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
            />
            <span>〜</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg disabled:opacity-50 transition-all"
          >
            {isSearching ? "⏳ 集計中..." : "🔍 この期間で集計する"}
          </button>
        </section>

        {/* 🌟 ランキング・ダッシュボード（ローディングUI付き！） */}
        <section className="relative grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[400px]">
          {/* ローディング・スピナー・オーバーレイ */}
          {isSearching && (
            <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-2xl">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-indigo-300 font-bold tracking-widest animate-pulse">
                データを集計中...
              </p>
            </div>
          )}

          {/* スーパーチャット王 */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-yellow-900/50 p-6 rounded-2xl shadow-xl flex flex-col">
            <h3 className="text-xl font-bold text-yellow-500 flex items-center gap-2 border-b border-gray-800 pb-3 mb-4 sticky top-0 bg-gray-900 z-10">
              スパチャランキング
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2">
              {!rankings ? (
                <p className="text-gray-500 text-center py-10">
                  検索ボタンを押してください
                </p>
              ) : (
                rankings.topSpachas.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold w-5 text-gray-500 text-right">
                        {i + 1}
                      </span>
                      {v.iconUrl ? (
                        <img src={v.iconUrl} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-600"></div>
                      )}
                      <span className="font-bold break-all">{v.name}</span>
                    </div>
                    {/* 日本円換算済みの金額を表示！ */}
                    <span className="text-yellow-400 font-bold tracking-wider">
                      ¥{v.totalAmount.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 出席率ランキング（🌟 欠席ドリルダウン機能付き！） */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-blue-900/50 p-6 rounded-2xl shadow-xl flex flex-col">
            <h3 className="text-xl font-bold text-blue-500 flex items-center gap-2 border-b border-gray-800 pb-3 mb-4 sticky top-0 bg-gray-900 z-10">
              出席率 (コメントした配信数)
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2">
              {!rankings ? (
                <p className="text-gray-500 text-center py-10">
                  検索ボタンを押してください
                </p>
              ) : (
                rankings.topAttendance.map((v, i) => (
                  <div
                    key={i}
                    className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700 transition-all"
                  >
                    {/* クリックできるヘッダー部分 */}
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-700/50"
                      onClick={() =>
                        setExpandedUser(expandedUser === i ? null : i)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold w-5 text-gray-500 text-right">
                          {i + 1}
                        </span>
                        {v.iconUrl ? (
                          <img
                            src={v.iconUrl}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-600"></div>
                        )}
                        <span className="font-bold break-all">{v.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* 🌟 139枠中〇枠出席、という分母表示！ */}
                        <span className="text-blue-400 font-bold">
                          {v.count} / {rankings.totalStreams} 枠
                        </span>
                        <span className="text-gray-500 text-xs">
                          {expandedUser === i ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* 🌟 展開された「欠席リスト」エリア */}
                    {expandedUser === i && (
                      <div className="p-4 bg-gray-900/90 border-t border-gray-700 text-sm space-y-2 max-h-48 overflow-y-auto">
                        {v.count === rankings.totalStreams ? (
                          <p className="text-green-400 font-bold flex items-center gap-2">
                            <span>🎊</span> 全配信に出席しています！皆勤賞！
                          </p>
                        ) : (
                          <>
                            <p className="text-red-400 font-bold mb-2 flex items-center gap-2">
                              <span>❌</span> 欠席した配信 (
                              {rankings.totalStreams - v.count}枠):
                            </p>
                            {rankings.allStreams
                              .filter(
                                (stream) =>
                                  !v.attendedStreamIds.includes(stream.id),
                              ) // attendedに含まれないIDを抽出！
                              .map((missed) => (
                                <div
                                  key={missed.id}
                                  className="text-gray-400 truncate flex gap-3 items-center"
                                >
                                  <span className="text-gray-500 font-mono shrink-0">
                                    {new Date(
                                      missed.publishedAt,
                                    ).toLocaleDateString()}
                                  </span>
                                  <span className="truncate">
                                    {missed.title}
                                  </span>
                                </div>
                              ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 🌟 V-CRM 全自動データ抽出パネル（商談中は非表示！） */}
        <section className="mt-12 bg-gray-900/80 border border-indigo-900/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-indigo-400 mb-6 flex items-center gap-2 border-b border-indigo-900/50 pb-4">
            <span>⚙️</span> SaaS機能: スマート・データマイニング
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2 font-bold">
                🎯 対象チャンネルのURL ( /streams を推奨 )
              </label>
              <input
                type="text"
                placeholder="例: https://www.youtube.com/@OtsukaRay/streams"
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                id="extractUrl"
              />
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-full">
                <label className="block text-sm text-gray-400 mb-2 font-bold">
                  📅 検索開始日
                </label>
                <input
                  type="date"
                  id="extStart"
                  defaultValue="2025-01-01"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white"
                />
              </div>
              <span className="text-gray-500 hidden md:block mt-6">〜</span>
              <div className="w-full">
                <label className="block text-sm text-gray-400 mb-2 font-bold">
                  📅 検索終了日
                </label>
                <input
                  type="date"
                  id="extEnd"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white"
                />
              </div>
            </div>

            <button
              onClick={fetchVideoList}
              disabled={isFetchingList}
              className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg text-lg tracking-widest disabled:opacity-50"
            >
              {isFetchingList
                ? "⏳ リストを取得中..."
                : "📋 まずは対象期間の動画リストを取得する"}
            </button>

            {/* 🌟 ここから追加！最強のローカルファイル・インポート機能！ */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="text-gray-500 text-sm font-bold tracking-widest">OR</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>

            <div className="relative">
              <input
                type="file"
                accept=".txt,.tsv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const text = event.target?.result as string;
                    // タブ区切りのテキストを解析してリスト化するわ！
                    const lines = text.split('\n').filter(line => line.trim() !== '');
                    const videos = lines.map(line => {
                      const [url, title] = line.split('\t');
                      const id = url ? url.replace('https://youtu.be/', '').trim() : '';
                      return {
                        id,
                        title: title || 'タイトル不明',
                        date: 'TXTインポート', // 日付はクローラーが後で補完するわ！
                        isExtracted: false
                      };
                    }).filter(v => v.id); // IDがない空行は排除
                    
                    setFetchedVideos(videos);
                    // 読み込んだ瞬間、全件チェック状態にする親切設計よ！
                    setSelectedVideoIds(new Set(videos.map(v => v.id)));
                    alert(`✅ ${videos.length}件のアーカイブリストをインポートしたわ！`);
                  };
                  reader.readAsText(file);
                }}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg text-lg tracking-widest cursor-pointer transition-all"
              >
                <span>📁</span> 手動抽出したリスト (TXT) を一括インポート
              </label>
            </div>

            {/* 🌟 リスト表示エリア */}
            {fetchedVideos.length > 0 && (
              <div className="mt-6 bg-gray-950 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="font-bold text-indigo-300">
                    抽出する動画 ({selectedVideoIds.size} /{" "}
                    {fetchedVideos.length})
                  </h3>
                  <div className="space-x-4">
                    <button
                      onClick={() =>
                        setSelectedVideoIds(
                          new Set(fetchedVideos.map((v) => v.id)),
                        )
                      }
                      className="text-sm text-gray-400 hover:text-white bg-gray-800 px-3 py-1 rounded"
                    >
                      全選択
                    </button>
                    <button
                      onClick={() => setSelectedVideoIds(new Set())}
                      className="text-sm text-gray-400 hover:text-white bg-gray-800 px-3 py-1 rounded"
                    >
                      全解除
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-6 py-3 bg-gray-900/50 border-b border-gray-800 text-xs text-gray-400 font-bold tracking-wider">
                  <div className="w-5 flex-shrink-0"></div>
                  <div className="w-24 flex-shrink-0">配信日</div>
                  <div className="flex-1">タイトル</div>
                  <div className="w-20 flex-shrink-0 text-right pr-2">
                    ステータス
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto p-4 space-y-2">
                  {fetchedVideos.map((v) => (
                    <label
                      key={v.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${v.isExtracted ? "bg-indigo-900/10 border-indigo-900/30 opacity-60" : "bg-gray-900 hover:bg-gray-800 border-gray-800 hover:border-indigo-500/50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedVideoIds.has(v.id)}
                        onChange={() => toggleSelection(v.id)}
                        className="w-5 h-5 accent-indigo-500 rounded flex-shrink-0"
                      />
                      <span className="text-gray-400 text-sm w-24 flex-shrink-0">
                        {v.date}
                      </span>
                      <span
                        className={`text-gray-200 truncate font-medium flex-1 ${v.isExtracted ? "line-through text-gray-500" : ""}`}
                      >
                        {v.title}
                      </span>
                      <div className="w-20 flex-shrink-0 flex justify-end">
                        {v.isExtracted && (
                          <span className="text-xs font-bold text-indigo-400 bg-indigo-900/30 border border-indigo-700/50 px-2 py-1 rounded">
                            ✅ 抽出済
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="p-4 bg-gray-900 border-t border-gray-800">
                  {/* 🌟 抽出中ならプログレスバーを表示、そうじゃないなら抽出ボタンを表示！ */}
                  {progress.isRunning ? (
                    <div className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 shadow-inner">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-indigo-400 font-bold text-sm flex items-center gap-2">
                          <span className="animate-spin">⚙️</span> 抽出エンジン稼働中...
                        </span>
                        <span className="text-white font-mono font-bold">
                          {progress.current} / {progress.total} 件
                        </span>
                      </div>
                      {/* プログレスバー本体 */}
                      <div className="w-full bg-gray-800 rounded-full h-3 mb-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500" 
                          style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <p className="text-gray-500 text-xs truncate">
                        処理中: {progress.currentTitle}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={extractSelected}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg text-lg tracking-widest"
                    >
                      🚀 {selectedVideoIds.size}
                      件の動画をPM2ワーカーで安全に抽出する
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
