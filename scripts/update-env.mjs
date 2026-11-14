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

  const testSecret = "sk_test_1a54cf4b5718b2709f10e432d34cd6b05e88e07e";
  const testPublic = "pk_test_428175e4061a5f5a1c6b4c900ba9bb53677847b9";

  if (!content.includes("PAYSTACK_SECRET_KEY")) {
    content += `\n# Paystack (Card / International Diaspora Payments)\nPAYSTACK_SECRET_KEY="${testSecret}"\nPAYSTACK_PUBLIC_KEY="${testPublic}"\nPAYSTACK_CURRENCY="KES"\nPAYSTACK_MIN_AMOUNT_USD="4"\n`;
    modified = true;
    console.log("[Auto-Env] Added Paystack test credentials to .env");
  } else if (content.includes('PAYSTACK_SECRET_KEY=""') || content.includes('PAYSTACK_SECRET_KEY=" "')) {
    // Only inject default test keys if it is currently blank
    content = content.replace(/PAYSTACK_SECRET_KEY=.*$/m, `PAYSTACK_SECRET_KEY="${testSecret}"`);
    content = content.replace(/PAYSTACK_PUBLIC_KEY=.*$/m, `PAYSTACK_PUBLIC_KEY="${testPublic}"`);
    content = content.replace(/PAYSTACK_CURRENCY=.*$/m, `PAYSTACK_CURRENCY="KES"`);
    content = content.replace(/PAYSTACK_MIN_AMOUNT_USD=.*$/m, `PAYSTACK_MIN_AMOUNT_USD="4"`);
    modified = true;
    console.log("[Auto-Env] Updated Paystack blank credentials with test keys in .env");
  } else if (content.includes("sk_live_")) {
    console.log("[Auto-Env] Paystack is running in LIVE production mode with sk_live_ keys.");
  } else {
    console.log("[Auto-Env] Paystack credentials already configured in .env.");
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
