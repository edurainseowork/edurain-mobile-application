import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const PATTERNS = [
  { name: "Google / Firebase API Key", regex: /AIzaSy[A-Za-z0-9_-]{33}/ },
  { name: "Live/Test Razorpay Key", regex: /rzp_(live|test)_[A-Za-z0-9]{14,}/ },
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "Private Key", regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: "GitHub Personal Access Token", regex: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
];

const IGNORED = [
  ".env",
  ".env.example",
  "node_modules",
  ".git",
  "google-services.json",
  "GoogleService-Info.plist",
];

function checkFile(filePath) {
  if (IGNORED.some(ig => filePath.includes(ig))) return [];
  if (!fs.existsSync(filePath)) return [];
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) return [];

  const content = fs.readFileSync(filePath, "utf8");
  const violations = [];
  for (const p of PATTERNS) {
    if (p.regex.test(content)) {
      violations.push({ file: filePath, pattern: p.name });
    }
  }
  return violations;
}

try {
  const trackedFiles = execSync("git ls-files", { encoding: "utf8" }).trim().split("\n");
  let found = 0;
  for (const f of trackedFiles) {
    if (!f) continue;
    const v = checkFile(f);
    if (v.length > 0) {
      for (const item of v) {
        console.error(`🚨 [GitGuardian Local Guard] SECRET DETECTED in ${item.file}: ${item.pattern}`);
        found++;
      }
    }
  }
  if (found > 0) {
    console.error(`\n❌ Secret check failed: Found ${found} secret(s). Please move all secrets to .env before committing.`);
    process.exit(1);
  } else {
    console.log("✅ [GitGuardian Local Guard] No hardcoded secrets found in tracked files.");
    process.exit(0);
  }
} catch (err) {
  console.error("Secret check error:", err.message);
  process.exit(1);
}
