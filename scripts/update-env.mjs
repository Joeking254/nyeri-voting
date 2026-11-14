import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
  let content = fs.readFileSync(envPath, "utf8");
  let modified = false;

  const replacements = [
    ["13.61.11.252", "13.62.100.156"],
    ["http://localhost:3000", "http://13.62.100.156"],
  ];

  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.replaceAll(from, to);
      modified = true;
      console.log(`[Auto-Env] Replaced ${from} -> ${to} in .env`);
    }
  }

  if (!content.includes("PAYSTACK_SECRET_KEY")) {
    content += `\n# Paystack (Card / International Diaspora Payments)\nPAYSTACK_SECRET_KEY=""\nPAYSTACK_PUBLIC_KEY=""\nPAYSTACK_CURRENCY="USD"\nPAYSTACK_MIN_AMOUNT_USD="4"\n`;
    modified = true;
    console.log("[Auto-Env] Added Paystack configuration placeholders to .env");
  }

  if (modified) {
    fs.writeFileSync(envPath, content, "utf8");
    console.log("[Auto-Env] Successfully updated .env with live EC2 IP http://13.62.100.156");
  } else {
    console.log("[Auto-Env] .env is already up to date with live EC2 IP.");
  }
} else {
  console.log("[Auto-Env] No .env file found in working directory.");
}
