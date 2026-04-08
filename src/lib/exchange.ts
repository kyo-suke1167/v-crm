// lib/exchange.ts
import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';

const RATES_FILE = path.join(process.cwd(), 'rates.json');

// 🌟 記号からISO通貨コードへの変換マップ（yt-dlpが記号で吐き出した場合の救済措置）
const SYMBOL_TO_ISO: Record<string, string> = {
  '₹': 'INR', // インドルピー
  '₫': 'VND', // ベトナムドン
  'A$': 'AUD', // オーストラリアドル
  '₪': 'ILS', // イスラエル新シェケル
};

export async function getCurrencyCaseSql() {
  let rates: Record<string, number> = {};
  
  // 1️⃣ キャッシュの確認（24時間以内ならファイルから読み込んでAPI制限を回避！）
  try {
    if (fs.existsSync(RATES_FILE)) {
      const stat = fs.statSync(RATES_FILE);
      const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
      if (ageHours < 24) {
        rates = JSON.parse(fs.readFileSync(RATES_FILE, 'utf-8'));
      }
    }
  } catch (e) { console.warn("レートキャッシュ読み込みエラー"); }

  // 2️⃣ キャッシュが古い、または無い場合は「無料のオープン為替API」から取得
  if (Object.keys(rates).length === 0) {
    try {
      // APIキー不要のオープンエンドポイント（ベースをJPYに設定）
      const res = await fetch('https://open.er-api.com/v6/latest/JPY');
      const data = await res.json();
      if (data && data.rates) {
        rates = data.rates;
        fs.writeFileSync(RATES_FILE, JSON.stringify(rates));
        console.log("世界161通貨の最新為替レートを取得・保存！");
      }
    } catch (e) {
      console.error("為替レート取得失敗。とりあえず1倍で計算。");
    }
  }

  // 3️⃣ 取得したレートを使って、SQLite用の「CASE文」を動的に組み立てる！
  let cases = '';
  
  if (Object.keys(rates).length > 0) {
    // 標準のISOコード（USD, TWDなど）の生成
    // 例: BaseがJPYなので、USDのrateは 0.0066。 JPYに戻すには amount / 0.0066 とする。
    for (const [currency, rate] of Object.entries(rates)) {
      if (currency !== 'JPY') {
        cases += ` WHEN '${currency}' THEN s.amount / ${rate}`;
      }
    }

    // 記号（₹, ₫など）の生成
    for (const [symbol, isoCode] of Object.entries(SYMBOL_TO_ISO)) {
      if (rates[isoCode]) {
        cases += ` WHEN '${symbol}' THEN s.amount / ${rates[isoCode]}`;
      }
    }
  }

  // 🌟 Prisma.raw() を使って、安全なSQLスニペットとして返す
  return Prisma.raw(`
    CASE s.currency
      ${cases}
      ELSE s.amount
    END
  `);
}