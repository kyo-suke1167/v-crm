"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

const currencyToFlag: Record<string, string> = {
  // --- 主要通貨 ---
  JPY: "🇯🇵", // 日本円
  USD: "🇺🇸", // 米ドル
  EUR: "🇪🇺", // ユーロ
  GBP: "🇬🇧", // 英ポンド

  // --- アジア・オセアニア ---
  TWD: "🇹🇼", // 台湾ドル
  HKD: "🇭🇰", // 香港ドル
  KRW: "🇰🇷", // 韓国ウォン
  SGD: "🇸🇬", // シンガポールドル
  MYR: "🇲🇾", // マレーシアリンギット
  IDR: "🇮🇩", // インドネシアルピア
  PHP: "🇵🇭", // フィリピンペソ
  THB: "🇹🇭", // タイバーツ
  VND: "🇻🇳", // ベトナムドン
  INR: "🇮🇳", // インドルピー
  AUD: "🇦🇺", // オーストラリアドル
  NZD: "🇳🇿", // ニュージーランドドル

  // --- 北米・中南米 ---
  CAD: "🇨🇦", // カナダドル
  MXN: "🇲🇽", // メキシコペソ
  BRL: "🇧🇷", // ブラジルレアル
  ARS: "🇦🇷", // アルゼンチンペソ
  CLP: "🇨🇱", // チリペソ
  COP: "🇨🇴", // コロンビアペソ
  PEN: "🇵🇪", // ペルーソル
  GTQ: "🇬🇹", // グアテマラケツァル
  BOB: "🇧🇴", // ボリビアボリビアーノ
  HNL: "🇭🇳", // ホンジュラスレンピラ
  CRC: "🇨🇷", // コスタリカコロン

  // --- ヨーロッパ ---
  CHF: "🇨🇭", // スイスフラン
  SEK: "🇸🇪", // スウェーデンクローナ
  NOK: "🇳🇴", // ノルウェークローネ
  DKK: "🇩🇰", // デンマーククローネ
  PLN: "🇵🇱", // ポーランドズウォティ
  HUF: "🇭🇺", // ハンガリーフォリント
  CZK: "🇨🇿", // チェココルナ
  RON: "🇷🇴", // ルーマニアレウ
  BGN: "🇧🇬", // ブルガリアレフ
  MKD: "🇲🇰", // 北マケドニアデナール

  // --- 中東・アフリカ ---
  ILS: "🇮🇱", // イスラエル新シェケル
  TRY: "🇹🇷", // トルコリラ
  SAR: "🇸🇦", // サウジアラビアリヤル
  AED: "🇦🇪", // UAEディルハム
  ZAR: "🇿🇦", // 南アフリカランド
};

const currencyToName: Record<string, string> = {
  JPY: "日本", TWD: "台湾", USD: "アメリカ", HKD: "香港", SGD: "シンガポール",
  KRW: "韓国", MXN: "メキシコ", CAD: "カナダ", AUD: "オーストラリア", GBP: "イギリス",
  EUR: "ヨーロッパ", BRL: "ブラジル", PHP: "フィリピン", INR: "インド", VND: "ベトナム",
  THB: "タイ", MYR: "マレーシア", IDR: "インドネシア", ARS: "アルゼンチン", CLP: "チリ",
  PEN: "ペルー", SEK: "スウェーデン", NOK: "ノルウェー", DKK: "デンマーク", CHF: "スイス",
  ILS: "イスラエル", TRY: "トルコ", SAR: "サウジアラビア", AED: "UAE", ZAR: "南アフリカ",
  GTQ: "グアテマラ", BOB: "ボリビア", HNL: "ホンジュラス", CRC: "コスタリカ", PLN: "ポーランド",
  HUF: "ハンガリー", CZK: "チェコ", RON: "ルーマニア", BGN: "ブルガリア", MKD: "北マケドニア"
};

// データ構造の型定義
type Stream = {
  id: string;
  videoId: string;
  title: string;
  publishedAt: string;
};
type RankingData = {
  topSpachas: any[];
  topAttendance: any[];
  topComments: any[]; // コメント数ランキング
  totalStreams: number;
  allStreams: Stream[];
  periodTotalAmount: number; // 前回追加した総額
  totalActiveListeners: number; // 🌟 今回追加したアクティブリスナー数
};

export default function VcrmDashboard() {
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");
  const [isSearching, setIsSearching] = useState(false);
  const [rankings, setRankings] = useState<RankingData | null>(null);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [exchangeData, setExchangeData] = useState<{
    rates: Record<string, number>;
    lastUpdated: string;
  } | null>(null);

  const [isAdmin, setIsAdmin] = useState(false); // 🌟 管理者かどうか
  const [showTotalBreakdown, setShowTotalBreakdown] = useState(false); // 🌟 全体内訳用

  // 🌟 ページ読み込み時に、過去にログインしたかチェック（リロード対策）
  useEffect(() => {
    const adminStatus = localStorage.getItem("vcrm_admin");
    if (adminStatus === "true") setIsAdmin(true);
  }, []);

  const handleAdminLogin = async () => {
    const password = prompt("管理者パスワードを入力してください：");
    if (!password) return;

    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAdmin(true);
        localStorage.setItem("vcrm_admin", "true");
        alert("🔓 管理者モード解除！データマイニングが使用可能！");
      } else {
        alert("🔒 パスワードが違う！やり直し！");
      }
    } catch (e) {
      alert("エラーが発生しました");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem("vcrm_admin");
    alert("管理者モードを終了。");
  };

  // 欠席リスト展開用
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  // 🌟 リスナー詳細モーダル用State
  const [selectedViewer, setSelectedViewer] = useState<{
    name: string;
    iconUrl: string;
  } | null>(null);
  const [viewerDetail, setViewerDetail] = useState<any>(null);

  const [showBreakdown, setShowBreakdown] = useState(false);

  const [progress, setProgress] = useState({
    isRunning: false,
    current: 0,
    total: 0,
    currentTitle: "待機中...",
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/progress");
        const data = await res.json();
        setProgress(data);
      } catch (e) {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const [fetchedVideos, setFetchedVideos] = useState<any[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(
    new Set(),
  );
  const [isFetchingList, setIsFetchingList] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    setExpandedUser(null);
    setRankings(null);

    try {
      const res = await fetch("/api/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) setRankings(data);
      else alert("エラー: " + data.error);
    } catch (e) {
      alert("通信エラーが発生しました");
    } finally {
      setIsSearching(false);
    }
  };

  const openRateModal = async () => {
    setIsRateModalOpen(true);
    try {
      const res = await fetch("/api/rates");
      const data = await res.json();
      if (data.success) {
        setExchangeData({ rates: data.rates, lastUpdated: data.lastUpdated });
      } else {
        setExchangeData(null); // データがない場合
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 🌟 リスナー詳細を取得する関数（クリック時に発動！）
  const openViewerDetail = async (
    viewerId: string,
    name: string,
    iconUrl: string,
  ) => {
    setSelectedViewer({ name, iconUrl });
    setViewerDetail(null); // 一旦ローディング状態にする

    setShowBreakdown(false);

    try {
      const res = await fetch("/api/viewer-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerId }),
      });
      const data = await res.json();
      if (data.success) setViewerDetail(data);
    } catch (e) {
      alert("詳細の取得に失敗しました");
    }
  };

  const fetchVideoList = async () => {
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
    const newSet = new Set(selectedVideoIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedVideoIds(newSet);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans p-8 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-indigo-900 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-wider">
              V-CRM 2nd Edition ver.2.31
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              リスナー貢献度・エンゲージメント可視化システム
            </p>
          </div>
          <div
            onClick={openRateModal}
            className="bg-gray-900/80 border border-gray-700 p-3 rounded-xl shadow-md text-xs text-gray-300 cursor-pointer hover:bg-gray-800 hover:border-indigo-500 transition-all active:scale-95"
          >
            <span className="font-bold text-indigo-400">
              グローバル換算適用中:{" "}
            </span>
            <span className="underline decoration-indigo-500/50">
              世界161通貨を自動変換 (クリックでレート確認)
            </span>
            {/* 🌟 管理者ログイン/ログアウトボタン */}
          </div>
          <button
            onClick={isAdmin ? handleAdminLogout : handleAdminLogin}
            className={`p-3 rounded-xl border transition-all ${isAdmin ? "bg-indigo-900/50 border-indigo-500 text-indigo-300" : "bg-gray-900/80 border-gray-700 text-gray-500 hover:text-white"}`}
            title={isAdmin ? "ログアウト" : "管理者ログイン"}
          >
            {isAdmin ? "管理者モード" : "管理者ログイン"}
          </button>
        </header>

        <section className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-gray-300">検索期間:</h2>
            <input
              type="date"
              value={startDate}
              min="2019-04-13" // 🌟 2019/4/13以前は選べないようにロック！
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
            {isSearching ? "集計中..." : "この期間で集計する"}
          </button>
        </section>

        {/* 集計結果がある時だけ表示するサマリーエリア */}
        {rankings && !isSearching && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 🌟 期間内スパチャ総額（ボタン化！） */}
              <button 
                onClick={() => setShowTotalBreakdown(!showTotalBreakdown)}
                className="bg-gradient-to-br from-indigo-900/40 to-gray-900 border border-indigo-500/30 p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-all group relative"
              >
                <div className="absolute top-2 right-3 text-indigo-500/50 group-hover:text-indigo-400 text-xs font-bold">
                  内訳を見る ▼
                </div>
                <p className="text-gray-400 text-xs font-bold mb-2 tracking-widest">
                  期間内スパチャ総額
                </p>
                <p className="text-4xl font-black text-yellow-400 tracking-tighter">
                  <span className="text-xl mr-1">¥</span>
                  {(rankings as any).periodTotalAmount?.toLocaleString()}
                </p>
              </button>

              <div className="bg-gradient-to-br from-purple-900/40 to-gray-900 border border-purple-500/30 p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center">
                <p className="text-gray-400 text-xs font-bold mb-2 tracking-widest">期間内 配信数</p>
                <p className="text-4xl font-black text-purple-400">{rankings.totalStreams} <span className="text-xl">枠</span></p>
              </div>
              <div className="bg-gradient-to-br from-emerald-900/40 to-gray-900 border border-emerald-500/30 p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center">
                <p className="text-gray-400 text-xs font-bold mb-2 tracking-widest">アクティブリスナー数</p>
                <p className="text-4xl font-black text-emerald-400">{(rankings as any).totalActiveListeners?.toLocaleString()} <span className="text-xl">名</span></p>
              </div>
            </div>

            {/* 🌟 展開される全体の内訳パネル */}
            {showTotalBreakdown && (rankings as any).periodCurrencyBreakdown && (
              <div className="bg-gray-900 border border-indigo-500/50 rounded-xl p-6 shadow-xl animate-in fade-in slide-in-from-top-2">
                <p className="text-indigo-400 font-bold mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
                  <span>🌐</span> グローバル通貨内訳 (期間全体)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {(rankings as any).periodCurrencyBreakdown.map((item: any, idx: number) => (
                    <div key={idx} className="bg-gray-800/80 p-3 rounded-lg border border-gray-700">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-400">
                          {currencyToFlag[item.currency]} {item.currency}
                        </span>
                        <span className="text-sm text-yellow-400 font-bold">
                          ¥{Math.round(item.totalAmount * item.rate).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {item.rawSymbol} {item.totalAmount.toLocaleString()} × {item.rate.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🌟 3大ランキング・ダッシュボード（3つだからグリッド幅を調整！） */}
        <section className="relative grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[400px]">
          {isSearching && (
            <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-2xl">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-indigo-300 font-bold tracking-widest animate-pulse">
                データを集計中...
              </p>
            </div>
          )}

          {/* ① スーパーチャット王 */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-yellow-900/50 p-6 rounded-2xl shadow-xl flex flex-col h-[800px]">
            <h3 className="text-xl font-bold text-yellow-500 flex items-center gap-2 border-b border-gray-800 pb-3 mb-4 sticky top-0 bg-gray-900 z-10">
              スパチャランキング
            </h3>
            <div className="space-y-3 overflow-y-auto pr-2 flex-1">
              {!rankings ? (
                <p className="text-gray-500 text-center py-10">
                  検索ボタンを押してください
                </p>
              ) : (
                rankings.topSpachas.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg border border-gray-700"
                  >
                    <div
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-700 p-1 rounded transition-all flex-1"
                      onClick={() =>
                        openViewerDetail(v.viewerId, v.name, v.iconUrl)
                      } // 🌟 クリックでモーダル！
                    >
                      <span className="font-bold w-5 text-gray-500 text-right">
                        {i + 1}
                      </span>
                      {v.iconUrl ? (
                        <img src={v.iconUrl} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-600"></div>
                      )}
                      <span className="font-bold truncate w-24 text-indigo-300 hover:text-indigo-200 underline decoration-indigo-500/30">
                        {v.name}
                      </span>
                      <span
                        className="text-sm opacity-80"
                        title={v.primaryCurrency}
                      >
                        {currencyToFlag[v.primaryCurrency] || "🌐"}
                      </span>
                    </div>
                    <span className="text-yellow-400 font-bold">
                      ¥{v.totalAmount?.toLocaleString() || 0}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ② 出席率ランキング */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-blue-900/50 p-6 rounded-2xl shadow-xl flex flex-col h-[800px]">
            <h3 className="text-xl font-bold text-blue-500 flex items-center gap-2 border-b border-gray-800 pb-3 mb-4 sticky top-0 bg-gray-900 z-10">
              出席率 (コメントした枠数)
            </h3>
            <div className="space-y-3 overflow-y-auto pr-2 flex-1">
              {!rankings ? (
                <p className="text-gray-500 text-center py-10">
                  検索ボタンを押してください
                </p>
              ) : (
                rankings.topAttendance.map((v, i) => (
                  <div
                    key={i}
                    className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700"
                  >
                    <div className="flex items-center justify-between p-2">
                      <div
                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-700 p-1 rounded transition-all flex-1"
                        onClick={() =>
                          openViewerDetail(v.viewerId, v.name, v.iconUrl)
                        } // 🌟 クリックでモーダル！
                      >
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
                        <span className="font-bold truncate w-24 text-indigo-300 hover:text-indigo-200 underline decoration-indigo-500/30">
                          {v.name}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-700 rounded"
                        onClick={() =>
                          setExpandedUser(expandedUser === i ? null : i)
                        } // 🌟 アコーディオンはこっち！
                      >
                        <span className="text-blue-400 font-bold text-sm">
                          {v.count} / {rankings.totalStreams}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {expandedUser === i ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {expandedUser === i && (
                      <div className="p-4 bg-gray-900/90 border-t border-gray-700 text-sm space-y-2 max-h-48 overflow-y-auto">
                        {v.count === rankings.totalStreams ? (
                          <p className="text-green-400 font-bold flex items-center gap-2">
                            皆勤賞！
                          </p>
                        ) : (
                          <>
                            <p className="text-red-400 font-bold mb-2 flex items-center gap-2">
                              欠席した配信:
                            </p>
                            {rankings.allStreams
                              .filter(
                                (stream) =>
                                  !v.attendedStreamIds.includes(stream.id),
                              )
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
                                  <span className="truncate text-xs">
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

          {/* ③ コメント数ランキング */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-emerald-900/50 p-6 rounded-2xl shadow-xl flex flex-col h-[800px]">
            <h3 className="text-xl font-bold text-emerald-500 flex items-center gap-2 border-b border-gray-800 pb-3 mb-4 sticky top-0 bg-gray-900 z-10">
              コメント総数ランキング
            </h3>
            <div className="space-y-3 overflow-y-auto pr-2 flex-1">
              {!rankings ? (
                <p className="text-gray-500 text-center py-10">
                  検索ボタンを押してください
                </p>
              ) : (
                (rankings.topComments || []).map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg border border-gray-700"
                  >
                    <div
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-700 p-1 rounded transition-all flex-1"
                      onClick={() =>
                        openViewerDetail(v.viewerId, v.name, v.iconUrl)
                      } // 🌟 クリックでモーダル！
                    >
                      <span className="font-bold w-5 text-gray-500 text-right">
                        {i + 1}
                      </span>
                      {v.iconUrl ? (
                        <img src={v.iconUrl} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-600"></div>
                      )}
                      <span className="font-bold truncate w-24 text-indigo-300 hover:text-indigo-200 underline decoration-indigo-500/30">
                        {v.name}
                      </span>
                    </div>
                    <span className="text-emerald-400 font-bold">
                      {v.count?.toLocaleString() || 0} 回
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 🌟 V-CRM 全自動データ抽出パネル */}
        {/* 🌟 管理者のみが表示・操作できる聖域 */}
        {isAdmin && (
          <section className="mt-12 bg-gray-900/80 border border-indigo-900/50 rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-indigo-900/50 pb-4">
              <h2 className="text-xl font-bold text-indigo-400 flex items-center gap-2">
                <span>⚙️</span> SaaS機能: スマート・データマイニング
              </h2>
              <span className="text-[10px] bg-indigo-500 text-white px-2 py-1 rounded-full font-black">
                ADMIN ONLY
              </span>
            </div>

            {progress.isRunning ? (
              <div className="w-full bg-gray-950 border-2 border-indigo-500 rounded-xl p-6 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-indigo-400 font-bold text-lg flex items-center gap-3">
                    <span className="animate-spin text-2xl">⚙️</span>{" "}
                    抽出エンジンフル稼働中...
                  </span>
                  <span className="text-white font-mono font-bold text-2xl">
                    {progress.current} / {progress.total}{" "}
                    <span className="text-sm text-gray-400">件</span>
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-4 mb-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-500 relative"
                    style={{
                      width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                    }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm truncate font-mono">
                  ▶️ 現在の処理: {progress.currentTitle}
                </p>
              </div>
            ) : (
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

                <div className="flex items-center gap-4 mt-4">
                  <div className="flex-1 h-px bg-gray-700"></div>
                  <span className="text-gray-500 text-sm font-bold tracking-widest">
                    OR
                  </span>
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
                        const lines = text
                          .split("\n")
                          .filter((line) => line.trim() !== "");
                        const videos = lines
                          .map((line) => {
                            const [url, title] = line.split("\t");
                            const id = url
                              ? url.replace("https://youtu.be/", "").trim()
                              : "";
                            return {
                              id,
                              title: title || "タイトル不明",
                              date: "TXTインポート",
                              isExtracted: false,
                            };
                          })
                          .filter((v) => v.id);
                        setFetchedVideos(videos);
                        setSelectedVideoIds(new Set(videos.map((v) => v.id)));
                        alert(
                          `✅ ${videos.length}件のアーカイブリストをインポートしたわ！`,
                        );
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
                      <button
                        onClick={extractSelected}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg text-lg tracking-widest"
                      >
                        🚀 {selectedVideoIds.size}{" "}
                        件の動画をPM2ワーカーで安全に抽出する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
      {/* 🌟 リスナー詳細モーダル（クリックで出現！） */}
      {selectedViewer && (() => {
        // 🌟 【追加魔法】JPY換算額でソートし、「真の主力通貨」を決定する
        const sortedBreakdown = viewerDetail?.currencyBreakdown 
          ? [...viewerDetail.currencyBreakdown].sort((a: any, b: any) => (b.totalAmount * b.rate) - (a.totalAmount * a.rate))
          : [];
        const topCurrency = sortedBreakdown[0]; // これが本当の一番投げている通貨！

        return (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedViewer(null)}
          >
            <div
              className="bg-gray-900 border border-indigo-500/50 rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.3)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* モーダルの上部（国名と国旗の追加） */}
              <div className="p-6 bg-gradient-to-b from-indigo-900/40 to-transparent flex flex-col items-center border-b border-gray-800 shrink-0">
                {selectedViewer.iconUrl ? (
                  <img src={selectedViewer.iconUrl} className="w-24 h-24 rounded-full border-4 border-gray-800 shadow-xl mb-4" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-700 border-4 border-gray-800 mb-4"></div>
                )}
                <h2 className="text-2xl font-bold text-white text-center break-all">
                  {selectedViewer.name}
                </h2>
                {/* 🌟 真の主力国旗を表示！ */}
                {topCurrency && (
                  <p className="mt-2 text-sm font-bold px-3 py-1 bg-gray-800 rounded-full border border-gray-700 text-gray-300">
                    {currencyToFlag[topCurrency.currency]} {currencyToName[topCurrency.currency] || "不明"} ({topCurrency.currency})
                  </p>
                )}
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                {!viewerDetail ? (
                  <div className="flex justify-center py-8">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex flex-col justify-center">
                        <p className="text-gray-400 text-xs font-bold mb-1">
                          初めてコメントした配信
                        </p>
                        {viewerDetail.firstStream ? (
                          <div>
                            <p className="text-white font-medium text-sm truncate" title={viewerDetail.firstStream.title}>
                              {viewerDetail.firstStream.title}
                            </p>
                            <p className="text-indigo-300 text-xs mt-1 font-mono">
                              📅 {new Date(viewerDetail.firstStream.publishedAt).toLocaleDateString()}
                            </p>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">データなし</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700 text-center flex flex-col justify-center">
                          <p className="text-gray-400 text-[10px] font-bold mb-1">出席率</p>
                          <p className="text-lg font-bold text-blue-400">
                            {viewerDetail.attendedCount} <span className="text-[10px] text-gray-500">/ {viewerDetail.totalStreams}</span>
                          </p>
                          <p className="text-[10px] font-bold text-blue-300 mt-1">
                            ({viewerDetail.totalStreams > 0 ? Math.round((viewerDetail.attendedCount / viewerDetail.totalStreams) * 100) : 0}%)
                          </p>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700 text-center flex flex-col justify-center">
                          <p className="text-gray-400 text-[10px] font-bold mb-1">累計コメント</p>
                          <p className="text-lg font-bold text-emerald-400">
                            {viewerDetail.totalComments.toLocaleString()} <span className="text-[10px] text-gray-500">回</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 🌟 累計スパチャ額（中央寄せ＆目立たせる！） */}
                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-xl flex flex-col items-center justify-center text-center shadow-inner">
                      <p className="text-yellow-500/60 text-xs font-bold uppercase tracking-wider mb-2">
                        リスナー累計スパチャ額
                      </p>
                      <p className="text-5xl font-black text-yellow-400 font-mono tracking-tighter">
                        ¥{viewerDetail.totalSpacha.toLocaleString()}
                      </p>
                    </div>

                    {/* 🌟 換算前の生データ（証拠）＆計算式 */}
                    {sortedBreakdown.length > 0 && (
                      <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 mt-4">
                        <p className="text-gray-400 text-xs font-bold mb-3 border-b border-gray-700 pb-2 flex items-center gap-2">
                          <span>🔍</span> 換算前の生データ（証拠）と計算式
                        </p>
                        {/* 🌟 space-y-3 から grid (2列) に変更！ */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* map対象も viewerDetail ではなく sortedBreakdown に変更！ */}
                          {sortedBreakdown.map((item: any, idx: number) => (
                            <div key={idx} className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 flex flex-col justify-between">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-gray-300">
                                  {currencyToFlag[item.currency]} {item.currency}
                                </span>
                                <span className="text-sm text-yellow-400 font-mono font-bold">
                                  ¥{Math.round(item.totalAmount * item.rate).toLocaleString()}
                                </span>
                              </div>
                              <div className="bg-black/50 p-2 rounded flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-bold w-10 truncate">{item.rawSymbol}</span>
                                <span className="text-sm font-mono text-gray-300 flex-1 text-right">{item.totalAmount.toLocaleString()}</span>
                                <span className="text-[10px] text-gray-500 w-12 text-right">× {item.rate.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-4 bg-gray-950 flex justify-end border-t border-gray-800 shrink-0">
                <button
                  onClick={() => setSelectedViewer(null)}
                  className="px-8 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg font-bold transition-all"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🌟 為替レート確認モーダル */}
      {isRateModalOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setIsRateModalOpen(false)}
        >
          <div
            className="bg-gray-900 border border-indigo-500/50 rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.3)] w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-b from-indigo-900/40 to-transparent border-b border-gray-800">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>💱</span> 最新の為替レート
              </h2>
              <p className="text-gray-400 text-xs mt-2">
                最終更新:{" "}
                {exchangeData?.lastUpdated
                  ? new Date(exchangeData.lastUpdated).toLocaleString()
                  : "未取得"}
              </p>
            </div>

            <div className="p-6">
              {!exchangeData ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-2">
                    まだレートデータがありません。
                  </p>
                  <p className="text-indigo-400 font-bold text-sm">
                    一度「検索」を実行すると、最新レートが自動取得されます！
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-300 font-bold mb-3 border-b border-gray-800 pb-2">
                    よく使われる通貨の現在価値 (1通貨 = ? 円)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* ベースがJPY(1円=X外貨)なので、1/rate で「1外貨=何円か」を計算するわよ！ */}
                    {[
                      "USD",
                      "TWD",
                      "HKD",
                      "KRW",
                      "EUR",
                      "SGD",
                      "ARS",
                      "GBP",
                    ].map((currency) => {
                      const rate = exchangeData.rates[currency];
                      if (!rate) return null;
                      const jpyValue = 1 / rate;
                      return (
                        <div
                          key={currency}
                          className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 flex justify-between items-center"
                        >
                          <span className="text-gray-400 font-bold">
                            {currency}
                          </span>
                          <span className="text-white font-mono">
                            ¥
                            {jpyValue < 1
                              ? jpyValue.toFixed(2)
                              : jpyValue.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 text-right mt-4 mt-2">
                    ※その他、全161通貨に対応済み
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-950 flex justify-end border-t border-gray-800">
              <button
                onClick={() => setIsRateModalOpen(false)}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg font-bold transition-all"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
