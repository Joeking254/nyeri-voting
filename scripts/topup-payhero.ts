import { config } from "dotenv";
config();

import { topupPayHeroServiceWallet } from "../src/lib/payhero";

async function main() {
  const args = process.argv.slice(2);
  const amount = Number(args[0]) || 50;
  const phone = args[1] || "0701969604";

  console.log(`Triggering PayHero Service Wallet top-up of KES ${amount} to phone ${phone}...`);
  try {
    const res = await topupPayHeroServiceWallet(amount, phone);
    console.log("PayHero response:", res);
    console.log(`STK push prompt sent! Check your phone (${phone}) and enter your M-Pesa PIN.`);
  } catch (err: any) {
    console.error("Top-up request failed:", err.message);
  }
}

main();
