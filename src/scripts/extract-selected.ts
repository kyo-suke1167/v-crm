import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8")
    .split("\n")
    .forEach((line) => {
      if (line.trim().startsWith("#") || !line.includes("=")) return;
      const [key, ...value] = line.split("=");
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = value
          .join("=")
          .trim()
          .replace(/(^"|"$)/g, "");
      }
    });
}

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const TMP_DIR = path.join(process.cwd(), "tmp_chats");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const PROGRESS_FILE = path.join(process.cwd(), "progress.json");

function updateProgress(isRunning: boolean, current: number, total: number, title: string) {
  const data = JSON.stringify({ isRunning, current, total, currentTitle: title });
  fs.writeFileSync(PROGRESS_FILE, data, "utf-8");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const targetFile = path.join(TMP_DIR, "targets.txt");
  if (!fs.existsSync(targetFile)) {
    console.error("❌ 対象動画のリストファイル(targets.txt)が見つかりません！");
    process.exit(1);
  }

  const idsRaw = fs.readFileSync(targetFile, "utf-8");
  const videoIds = idsRaw.split(",").filter((id) => id.trim() !== "");

  if (videoIds.length === 0) {
    console.log("📭 対象動画がありません。ワーカーを終了します。");
    updateProgress(false, 0, 0, "待機中...");
    return;
  }

  console.log(`\n🚀 [V-CRM Batch] 抽出開始！ 対象: ${videoIds.length}件`);
  updateProgress(true, 0, videoIds.length, "起動準備中...");

  try {
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      let title = `アーカイブ (${videoId})`;
      let publishedAt = new Date();
      
      updateProgress(true, i, videoIds.length, `情報取得中: ${videoId}`);
      console.log(`\n▶️ [${i + 1}/${videoIds.length}] 処理中: ${videoId}`);

      const existingStream = await prisma.streamEvent.findUnique({ where: { videoId } });
      if (existingStream) {
        console.log(`⏩ 登録済みのためスキップ！`);
        updateProgress(true, i + 1, videoIds.length, `スキップ: ${existingStream.title}`);
        continue;
      }

      const metaCmd = `yt-dlp --js-runtimes node --print "%(title)s@@@%(upload_date)s@@@%(release_date)s" "https://youtu.be/${videoId}"`;
      try {
        const metaRaw = execSync(metaCmd, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("@@@");
        if (metaRaw[0]) title = metaRaw[0];
        const rawDate = metaRaw[1] && metaRaw[1] !== "NA" ? metaRaw[1] : metaRaw[2] && metaRaw[2] !== "NA" ? metaRaw[2] : null;
        if (rawDate && rawDate.length >= 8) {
          publishedAt = new Date(`${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}T12:00:00Z`);
        }
      } catch (e) { console.log(`⚠️ メタデータ取得失敗`); }

      updateProgress(true, i, videoIds.length, `チャット抽出中: ${title}`);
      const outPath = path.join(TMP_DIR, videoId);
      const jsonFile = `${outPath}.live_chat.json`;

      if (!fs.existsSync(jsonFile)) {
        try {
          execSync(`yt-dlp --js-runtimes node --write-subs --sub-langs live_chat --skip-download -o "${outPath}" "https://youtu.be/${videoId}"`, { stdio: "ignore" });
        } catch (e) { continue; }
      }

      if (!fs.existsSync(jsonFile)) continue;

      updateProgress(true, i, videoIds.length, `DB保存中: ${title}`);
      const data = fs.readFileSync(jsonFile, "utf-8");
      const viewersMap = new Map();
      const commentsToInsert: any[] = [];
      const superChatsToInsert: any[] = [];
      const giftsToInsert: any[] = [];

      for (const line of data.split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const item = parsed?.replayChatItemAction?.actions?.[0]?.addChatItemAction?.item || parsed?.addChatItemAction?.item;
          if (!item) continue;
          
          const renderer = item?.liveChatTextMessageRenderer || item?.liveChatPaidMessageRenderer || item?.liveChatMembershipGiftPurchaseAnnouncementRenderer;
          if (renderer) {
            const authorId = renderer.authorExternalChannelId;
            if (authorId && !viewersMap.has(authorId)) {
              viewersMap.set(authorId, {
                youtubeId: authorId,
                name: renderer.authorName?.simpleText || "匿名",
                iconUrl: renderer.authorPhoto?.thumbnails?.[0]?.url || "",
              });
            }
            if (item?.liveChatTextMessageRenderer) {
              commentsToInsert.push({ viewerId: authorId, message: renderer.message?.runs?.map((r: any) => r.text).join("") || "", timestampText: renderer.timestampText?.simpleText || "0:00" });
            }
            if (item?.liveChatPaidMessageRenderer) {
              const rawText = renderer.purchaseAmountText?.simpleText || "¥0";
              const amount = parseFloat(rawText.replace(/[^\d.]/g, "")) || 0;
              const symbol = rawText.replace(/[\d.,\s]/g, "").trim().toUpperCase();
              superChatsToInsert.push({ viewerId: authorId, amount, rawSymbol: symbol, currency: "UNKNOWN", message: "" });
            }
            if (item?.liveChatMembershipGiftPurchaseAnnouncementRenderer) {
              const giftText = renderer.headerRenderer?.liveChatMembershipGiftPurchaseAnnouncementHeaderRenderer?.headerText?.runs?.map((r:any)=>r.text).join("") || "";
              const count = parseInt(giftText.replace(/[^\d]/g, "")) || 1;
              giftsToInsert.push({ viewerId: authorId, count });
            }
          }
        } catch (e) {}
      }

      await prisma.$transaction(async (tx) => {
        const stream = await tx.streamEvent.create({ data: { videoId, title, publishedAt } });
        const existingIds = (await tx.viewer.findMany({ where: { youtubeId: { in: Array.from(viewersMap.keys()) } }, select: { youtubeId: true } })).map(v => v.youtubeId);
        const newV = Array.from(viewersMap.values()).filter(v => !existingIds.includes(v.youtubeId));
        if (newV.length > 0) await tx.viewer.createMany({ data: newV });
        const dbVMap = new Map((await tx.viewer.findMany({ where: { youtubeId: { in: Array.from(viewersMap.keys()) } } })).map(v => [v.youtubeId, v.id]));
        const validC = commentsToInsert.filter(c => dbVMap.has(c.viewerId)).map(c => ({ ...c, viewerId: dbVMap.get(c.viewerId)!, streamId: stream.id }));
        if (validC.length > 0) await tx.comment.createMany({ data: validC });
        const validS = superChatsToInsert.filter(s => dbVMap.has(s.viewerId)).map(s => ({ ...s, viewerId: dbVMap.get(s.viewerId)!, streamId: stream.id }));
        if (validS.length > 0) await tx.superChat.createMany({ data: validS });
        const validG = giftsToInsert.filter(g => dbVMap.has(g.viewerId)).map(g => ({ ...g, viewerId: dbVMap.get(g.viewerId)!, streamId: stream.id }));
        if (validG.length > 0) await tx.giftedMembership.createMany({ data: validG });
      });

      fs.unlinkSync(jsonFile);
      await sleep(Math.floor(Math.random() * 7000) + 3000);
    }
    
    // 🌟 修正：全完了時にリストを空にする（エンドレス再起動防止！）
    fs.writeFileSync(targetFile, "", "utf-8");
    console.log(`\n🎉🎉 ジョブ完了！targets.txtをクリアしました。`);
    updateProgress(false, videoIds.length, videoIds.length, "全件抽出完了！");
    
  } catch (error) {
    console.error("❌ 異常終了:", error);
    updateProgress(false, 0, 0, "エラー停止");
  } finally {
    await prisma.$disconnect();
  }
}
main();