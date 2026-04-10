"use client";
import React, { useState, useRef } from "react";
import { M_PLUS_Rounded_1c } from "next/font/google";
// 🌟 【新規追加】美しいSVGアイコン（スピーカー）をインポート！
import { Volume2, VolumeX } from "lucide-react";

const roundedFont = M_PLUS_Rounded_1c({
  weight: ["400", "800", "900"],
  display: "swap",
});

const colors = {
  bgLight: "#00FF00",
  accentPurple: "#9B82C8",
  bingoBase: "#C3B1E1",
  textDarkPurple: "#5C4B8A",
  bgWhite: "#FFFFFF",
  textWhite: "#FFFFFF",
};

type BingoCell = { text: string; value?: string };

// 🌟 【日本語版カード】バランスよく散りばめた絶妙なシャッフル配置！
const cardData_ja_fixed: BingoCell[] = [
  // 1行目
  { text: "新\nお披露目" },
  { text: "オレンジ\nスパ" },
  { text: "同接数", value: "1000" },
  { text: "メンギフ", value: "50" },
  { text: "水スパ" },
  // 2行目
  { text: "新規\nメンバー\nシップ" },
  { text: "青スパ" },
  { text: "記念ケーキ\nもぐもぐ" },
  { text: "赤スパ" },
  { text: "高評価", value: "1000" },
  // 3行目（真ん中は不動のセンター！）
  { text: "レイド" },
  { text: "黄スパ" },
  { text: "7周年\n記念配信" },
  { text: "ランキング\n発表" },
  { text: "高評価", value: "2000" },
  // 4行目
  { text: "虹スパ" },
  { text: "リアクション", value: "10000" },
  { text: "緑スパ" },
  { text: "7周年の\n振り返り" },
  { text: "同接数", value: "500" },
  // 5行目
  { text: "ピンク\nスパ" },
  { text: "新規\nFANBOX" },
  { text: "Doneru" },
  { text: "ミニ\nライブ" },
  { text: "今日\n誕生日の人" },
];

// 🌟 【英語版カード】日本語版と完全にシンクロさせたシャッフル配置！
const cardData_en_fixed: BingoCell[] = [
  // 1st Row
  { text: "New\nUnveiling" },
  { text: "Orange\nSC" },
  { text: "Concurrent\nViewers", value: "1000" },
  { text: "Gift\nMemberships", value: "50" },
  { text: "Cyan SC" },
  // 2nd Row
  { text: "New\nMembership " },
  { text: "Blue SC" },
  { text: "Anniversary\nCake" },
  { text: "Red SC" },
  { text: "Likes", value: "1000" },
  // 3rd Row (Center is fixed!)
  { text: "Raid" },
  { text: "Yellow SC" },
  { text: "7th\nAnniversary\nStream" },
  { text: "Ranking\nReveal" },
  { text: "Likes", value: "2000" },
  // 4th Row
  { text: "Rainbow\nSC" },
  { text: "Reactions", value: "10000" },
  { text: "Green SC" },
  { text: "7th Year\nReview" },
  { text: "Concurrent\nViewers", value: "500" },
  // 5th Row
  { text: "Pink\nSC" },
  { text: "New\nFANBOX\nSub" },
  { text: "Doneru" },
  { text: "Mini Live\nPerformance" },
  { text: "Birthdays\nToday" },
];

// 固定カードリスト
const cards_fixed = [cardData_ja_fixed, cardData_en_fixed];

export default function VcrmBingo() {
  const [currentCardIndex, setCurrentCardIndex] = useState(0); // 0: JA, 1: EN
  const [openedCells, setOpenedCells] = useState<boolean[]>(
    Array(25).fill(false),
  );
  const [bingoCount, setBingoCount] = useState(0);
  const [bingoText, setBingoText] = useState<string | null>(null);
  
  // 🌟 【新規追加】ミュート状態を管理するステート
  const [isMuted, setIsMuted] = useState(false);
  // 🌟 【新規追加】音量を管理するステート（初期値50%）
  const [volume, setVolume] = useState(0.5);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentCard = cards_fixed[currentCardIndex];

  const checkBingo = (opened: boolean[]) => {
    const patterns = [
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24],
      [0, 5, 10, 15, 20],
      [1, 6, 11, 16, 21],
      [2, 7, 12, 17, 22],
      [3, 8, 13, 18, 23],
      [4, 9, 14, 19, 24],
      [0, 6, 12, 18, 24],
      [4, 8, 12, 16, 20],
    ];
    return patterns.filter((pattern) => pattern.every((index) => opened[index]))
      .length;
  };

  const fireConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles: any[] = [];
    const confettiColors = [
      "#C3B1E1",
      "#9B82C8",
      "#5C4B8A",
      "#FFFFFF",
      "#FFB7B2",
      "#FFD700",
    ];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 10 + 5,
        color:
          confettiColors[Math.floor(Math.random() * confettiColors.length)],
        vy: Math.random() * 5 + 3,
        vx: Math.random() * 4 - 2,
        rot: Math.random() * 360,
        rotSpeed: Math.random() * 5 - 2.5,
      });
    }

    let frameId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;
      particles.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx;
        p.rot += p.rotSpeed;
        if (p.y < canvas.height) active = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (active) frameId = requestAnimationFrame(render);
    };
    render();
  };

  const toggleCell = (cellIndex: number) => {
    setOpenedCells((prev) => {
      const newOpened = [...prev];
      newOpened[cellIndex] = !newOpened[cellIndex];
      const newCount = checkBingo(newOpened);

      if (newCount > bingoCount) {
        fireConfetti();
        
        // 🌟 【変更点】音量(volume)が0より大きく、かつミュートでない時に再生！
        if (!isMuted && volume > 0) {
          const bingoSound = new Audio('/bingo.mp3');
          bingoSound.volume = volume; // スライダーの音量を反映
          bingoSound.play().catch(error => console.error("音声の再生に失敗したわ:", error));
        }

        const text_ja = newCount === 1 ? "BINGO!!" : `${newCount} BINGO!!`;
        const text_en = newCount === 1 ? "BINGO!!" : `${newCount} BINGOS!!`;
        const effectText = currentCardIndex === 0 ? text_ja : text_en;

        setBingoText(effectText);
        setTimeout(() => setBingoText(null), 3500);
      }

      setBingoCount(newCount);
      return newOpened;
    });
  };

  const changeCard = (direction: number) => {
    const nextIndex =
      (currentCardIndex + direction + cards_fixed.length) % cards_fixed.length;
    setCurrentCardIndex(nextIndex);
    setBingoCount(checkBingo(openedCells));
  };

  const getVisualLength = (text: string) => {
    let length = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i].match(/[ -~]/)) length += 0.55;
      else length += 1;
    }
    return length;
  };

  const getDynamicTitleSize = (text: string) => {
    const lines = text.split("\n");
    const maxVisualLen = Math.max(...lines.map((l) => getVisualLength(l)));
    if (maxVisualLen <= 3.5) return "text-[14px] md:text-[24px]";
    if (maxVisualLen <= 4.5) return "text-[13px] md:text-[20px]";
    if (maxVisualLen <= 5.5) return "text-[11px] md:text-[18px]";
    return "text-[10px] md:text-[15px]";
  };

  const getDynamicValueSize = (val?: string) => {
    if (!val) return "";
    const visualLen = getVisualLength(val);
    if (visualLen <= 3.5) return "text-xl md:text-4xl";
    if (visualLen <= 5.5) return "text-base md:text-3xl";
    return "text-sm md:text-2xl";
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden ${roundedFont.className}`}
      style={{ backgroundColor: colors.bgLight }}
    >
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-[100]"
      ></canvas>

      {/* 🌟 【変更点】単一ボタンから、スライダー＋アイコンの複合パネルに変更！ */}
      <div
        className="fixed top-6 right-6 md:top-8 md:right-8 z-[120] bg-white rounded-full shadow-lg border-[3px] flex items-center px-4 py-2 gap-3 transition-all hover:shadow-xl"
        style={{ borderColor: colors.accentPurple }}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => {
            setVolume(parseFloat(e.target.value));
            if (isMuted) setIsMuted(false); // スライダーを動かしたらミュート解除
          }}
          className={`w-20 md:w-28 cursor-pointer transition-opacity ${isMuted ? 'opacity-40' : 'opacity-100'}`}
          style={{ accentColor: colors.accentPurple }}
          title="音量を調整"
        />
        <div className="w-[2px] h-6 bg-gray-200 rounded-full"></div>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
          style={{ color: colors.accentPurple }}
          title={isMuted ? "ミュート解除" : "ミュートする"}
        >
          {isMuted ? <VolumeX size={26} strokeWidth={2.5} /> : <Volume2 size={26} strokeWidth={2.5} />}
        </button>
      </div>

      <div
        className="flex items-center gap-6 mb-8 bg-white px-6 py-3 rounded-full shadow-lg border relative z-20 mt-4 md:mt-0"
        style={{ borderColor: colors.accentPurple }}
      >
        <button
          onClick={() => changeCard(-1)}
          className="text-5xl transition-transform hover:scale-110 active:scale-95"
          style={{ color: colors.accentPurple }}
        >
          ◀
        </button>
        <div className="text-center w-28">
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">
            言語
          </p>
          <p
            className="text-3xl font-black font-mono tracking-widest"
            style={{ color: colors.textDarkPurple }}
          >
            {currentCardIndex === 0 ? "JA" : "EN"}
          </p>
        </div>
        <button
          onClick={() => changeCard(1)}
          className="text-5xl transition-transform hover:scale-110 active:scale-95"
          style={{ color: colors.accentPurple }}
        >
          ▶
        </button>
      </div>

      <div
        className="relative p-2 rounded-2xl shadow-2xl w-full max-w-[650px] aspect-square flex flex-col items-center justify-center z-10"
        style={{
          backgroundColor: colors.bingoBase,
          border: `3px solid ${colors.accentPurple}`,
        }}
      >
        {bingoText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[110] animate-in zoom-in fade-in duration-500">
            <div
              className="bg-white/90 backdrop-blur-sm px-12 md:px-20 py-8 rounded-full shadow-[0_0_50px_rgba(155,130,200,0.6)] border-4 w-max max-w-[120%]"
              style={{ borderColor: colors.accentPurple }}
            >
              <p
                className="text-6xl md:text-9xl font-black text-transparent bg-clip-text tracking-tighter drop-shadow-xl whitespace-pre-line text-center"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${colors.accentPurple}, ${colors.textDarkPurple})`,
                }}
              >
                {bingoText}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-5 gap-1 md:gap-2 p-1 w-full h-full relative">
          {currentCard.map((cell, index) => {
            const isOpened = openedCells[index];
            const isCenter = index === 12;

            return (
              <button
                key={index}
                onClick={() => toggleCell(index)}
                className={`aspect-square flex flex-col items-center justify-center p-1 md:p-2 rounded-lg transition-all duration-300 border-2 active:scale-95 group overflow-hidden ${isOpened ? "shadow-inner scale-[0.97]" : "shadow-md hover:scale-105"}`}
                style={{
                  backgroundColor: isOpened
                    ? colors.accentPurple
                    : isCenter
                      ? "#F0E6FF"
                      : colors.bgWhite,
                  borderColor: isOpened
                    ? colors.textWhite
                    : isCenter
                      ? colors.accentPurple
                      : colors.bingoBase,
                  color: isOpened
                    ? colors.textWhite
                    : isCenter
                      ? colors.accentPurple
                      : colors.textDarkPurple,
                }}
              >
                <p
                  className={`font-black tracking-tight leading-snug text-center w-full px-0.5 whitespace-pre-line ${getDynamicTitleSize(cell.text)} ${!isOpened ? "group-hover:opacity-70" : ""} ${isCenter && !isOpened ? "animate-pulse" : ""}`}
                >
                  {cell.text}
                </p>
                {cell.value && (
                  <p
                    className={`mt-0.5 font-black tracking-tighter leading-none ${getDynamicValueSize(cell.value)}`}
                  >
                    {cell.value}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}