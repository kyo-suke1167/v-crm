// scripts/update-currency.ts
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔮 通貨変換プロセス（Transform）を開始するわ...");

  // 1. 辞書の読み込み
  const mapPath = path.join(process.cwd(), "currency_map.json");
  if (!fs.existsSync(mapPath)) {
    console.error("❌ currency_map.json が見つからないわよ！");
    return;
  }
  const currencyMap: Record<string, string> = JSON.parse(fs.readFileSync(mapPath, "utf-8"));

  // 2. 変換が必要な（UNKNOWNな）スパチャを取得
  const targets = await prisma.superChat.findMany({
    where: { currency: "UNKNOWN" }
  });

  if (targets.length === 0) {
    console.log("✅ 変換が必要なデータはもう残っていないわ。完璧よ。");
    return;
  }

  console.log(`📦 ${targets.length}件のデータを修正中...`);

  let updatedCount = 0;

  for (const sc of targets) {
    let matchedCurrency = "UNKNOWN";

    // 辞書を上から順番にチェック（長い記号から優先される仕組みよ）
    for (const [symbol, code] of Object.entries(currencyMap)) {
      if (sc.rawSymbol.includes(symbol)) {
        matchedCurrency = code;
        break; 
      }
    }

    if (matchedCurrency !== "UNKNOWN") {
      await prisma.superChat.update({
        where: { id: sc.id },
        data: { currency: matchedCurrency }
      });
      updatedCount++;
    }
  }

  console.log(`✨ 変換完了！ ${updatedCount} 件のスパチャに魂（通貨コード）を吹き込んだわ。`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());