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

// 🌟 ここを1つにまとめる！
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });
const TMP_DIR = path.join(process.cwd(), "tmp_chats");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  // 🌟 コマンド引数ではなく、安全なテキストファイルから対象IDを読み込む！
  const targetFile = path.join(TMP_DIR, "targets.txt");
  if (!fs.existsSync(targetFile)) {
    console.error("❌ 対象動画のリストファイル(targets.txt)が見つかりません！");
    process.exit(1);
  }

  const idsRaw = fs.readFileSync(targetFile, "utf-8");
  const videoIds = idsRaw.split(",").filter((id) => id.trim() !== "");

  console.log(
    `\n🚀 [V-CRM Batch] PM2常駐ワーカー起動！ 対象: ${videoIds.length}件`,
  );

  try {
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      console.log(`\n▶️ [${i + 1}/${videoIds.length}] 処理中: ${videoId}`);

      const existingStream = await prisma.streamEvent.findUnique({
        where: { videoId },
      });
      if (existingStream) {
        console.log(`⏩ 登録済みのためスキップ！`);
        continue;
      }

      const metaCmd = `yt-dlp --print "%(title)s@@@%(upload_date)s@@@%(release_date)s" "https://youtu.be/${videoId}"`;
      let title = `アーカイブ (${videoId})`,
        publishedAt = new Date();
      try {
        const metaRaw = execSync(metaCmd, { encoding: "utf-8" })
          .trim()
          .split("@@@");
        if (metaRaw[0]) title = metaRaw[0];

        // upload_dateがなければrelease_dateを使う
        const rawDate =
          metaRaw[1] && metaRaw[1] !== "NA"
            ? metaRaw[1]
            : metaRaw[2] && metaRaw[2] !== "NA"
              ? metaRaw[2]
              : null;

        if (rawDate && rawDate.length >= 8) {
          publishedAt = new Date(
            `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}T12:00:00Z`,
          );
        }
      } catch (e) {}

      const outPath = path.join(TMP_DIR, videoId);

      // 1️⃣ まずはチャットのダウンロードを試みる！
      try {
        execSync(
          `yt-dlp --write-subs --sub-langs live_chat --skip-download -o "${outPath}" "https://youtu.be/${videoId}"`,
          { stdio: "ignore" },
        );
      } catch (e) {
        console.log(
          `⚠️ チャットがない、またはメン限のためスキップ！（幽霊データを回避）`,
        );
        continue;
      }

      const jsonFile = `${outPath}.live_chat.json`;
      if (!fs.existsSync(jsonFile)) continue;

      // 2️⃣ 🌟 JSONファイルが確実に存在することを確認してから、初めてDBに「枠」を作る！
      const stream = await prisma.streamEvent.create({
        data: { videoId, title, publishedAt },
      });

      const data = fs.readFileSync(jsonFile, "utf-8");
      const viewersMap = new Map();
      const commentsToInsert: any[] = [];
      const superChatsToInsert: any[] = [];

      for (const line of data.split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const item =
            parsed?.replayChatItemAction?.actions?.[0]?.addChatItemAction
              ?.item || parsed?.addChatItemAction?.item;
          if (!item) continue;
          const renderer =
            item?.liveChatTextMessageRenderer ||
            item?.liveChatPaidMessageRenderer;
          if (renderer) {
            const authorId = renderer.authorExternalChannelId;
            if (authorId && !viewersMap.has(authorId))
              viewersMap.set(authorId, {
                youtubeId: authorId,
                name: renderer.authorName?.simpleText || "匿名",
                iconUrl: renderer.authorPhoto?.thumbnails?.[0]?.url || "",
              });
            if (item?.liveChatTextMessageRenderer)
              commentsToInsert.push({
                viewerId: authorId,
                streamId: stream.id,
                message:
                  renderer.message?.runs?.map((r: any) => r.text).join("") ||
                  "",
                timestampText: renderer.timestampText?.simpleText || "0:00",
              });
            if (item?.liveChatPaidMessageRenderer) {
              const rawText = renderer.purchaseAmountText?.simpleText || "¥0";
              const amount = parseFloat(rawText.replace(/[^\d.]/g, "")) || 0;
              const symbol = rawText.replace(/[\d.,\s]/g, "").trim(); // 数字とカンマ等以外（記号）を抽出！

              let currency = "JPY";
              if (symbol.includes("$")) {
                if (symbol.includes("NT"))
                  currency = "TWD"; // 台湾ドル
                else if (symbol.includes("HK"))
                  currency = "HKD"; // 香港ドル
                else currency = "USD"; // 米ドル（その他$もひとまずUSD枠へ）
              } else if (symbol.includes("₩")) {
                currency = "KRW"; // 韓国ウォン
              } else if (symbol.includes("€")) {
                currency = "EUR"; // ユーロ
              } else if (symbol.includes("£")) {
                currency = "GBP"; // イギリス・ポンド
              } else if (symbol.includes("₱")) {
                currency = "PHP"; // フィリピン・ペソ
              }

              superChatsToInsert.push({
                viewerId: authorId,
                streamId: stream.id,
                amount,
                currency,
                message: "",
              });
            }
          }
        } catch (e) {}
      }

      const existingYoutubeIds = new Set(
        (
          await prisma.viewer.findMany({
            where: { youtubeId: { in: Array.from(viewersMap.keys()) } },
            select: { youtubeId: true },
          })
        ).map((v) => v.youtubeId),
      );
      const newViewers = Array.from(viewersMap.values()).filter(
        (v) => !existingYoutubeIds.has(v.youtubeId),
      );
      if (newViewers.length > 0)
        await prisma.viewer.createMany({ data: newViewers });

      const dbViewerMap = new Map(
        (
          await prisma.viewer.findMany({
            where: { youtubeId: { in: Array.from(viewersMap.keys()) } },
          })
        ).map((v) => [v.youtubeId, v.id]),
      );
      const validComments = commentsToInsert
        .filter((c) => dbViewerMap.has(c.viewerId))
        .map((c) => ({ ...c, viewerId: dbViewerMap.get(c.viewerId)! }));
      if (validComments.length > 0)
        await prisma.comment.createMany({ data: validComments });
      const validSuperChats = superChatsToInsert
        .filter((s) => dbViewerMap.has(s.viewerId))
        .map((s) => ({ ...s, viewerId: dbViewerMap.get(s.viewerId)! }));
      if (validSuperChats.length > 0)
        await prisma.superChat.createMany({ data: validSuperChats });

      console.log(
        `✅ 新規リスナー: ${newViewers.length}人 / コメ: ${validComments.length}件 / スパチャ: ${validSuperChats.length}件`,
      );
      fs.unlinkSync(jsonFile);

      // 大量処理なので、BAN対策の待機を少し長めの5秒にしておくわ！
      await sleep(5000);
    }
    console.log(`\n🎉🎉 139件などの大量ジョブが全て完了しました！お疲れ様！！`);
  } catch (error) {
    console.error("❌ エラー発生:", error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
