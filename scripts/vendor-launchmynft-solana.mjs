/**
 * Fetches LaunchMyNFT solana.js and patches mintCv3 so `currencyMint` is never
 * omitted (Anchor throws "currencyMint not provided" when their code passes null for SOL).
 * For SOL phases, Wrapped SOL mint is used instead.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const siteBrandPath = path.join(root, "src", "config", "siteBrand.ts");

const NEEDLE = "currencyMint:u.currency||null";
const REPLACEMENT =
  'currencyMint:u.currency!=null?u.currency:new Eo.PublicKey("So11111111111111111111111111111111111111112")';
const PATCH_MARKER = '!=null?u.currency:new Eo.PublicKey("So11111111111111111111111111111111111111112")';

function readVersion() {
  const src = fs.readFileSync(siteBrandPath, "utf8");
  const m = src.match(/LAUNCHMYNFT_SCRIPT_VERSION\s*=\s*"([^"]+)"/);
  if (!m) {
    throw new Error(`Could not parse LAUNCHMYNFT_SCRIPT_VERSION from ${siteBrandPath}`);
  }
  return m[1];
}

async function main() {
  const version = readVersion();
  const outDir = path.join(root, "public", "launchmynft", version);
  const outFile = path.join(outDir, "solana.js");
  const url = `https://storage.googleapis.com/scriptslmt/${version}/solana.js`;

  if (fs.existsSync(outFile)) {
    const existing = fs.readFileSync(outFile, "utf8");
    if (existing.includes(PATCH_MARKER) && !existing.includes(NEEDLE)) {
      console.log(`LaunchMyNFT solana.js already patched (${version}), skip download`);
      return;
    }
  }

  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status}: ${url}`);
  }
  let body = await res.text();
  const count = body.split(NEEDLE).length - 1;
  if (count !== 1) {
    throw new Error(
      `Expected exactly 1 occurrence of "${NEEDLE}", found ${count}. LaunchMyNFT may have updated their bundle; adjust scripts/vendor-launchmynft-solana.mjs`
    );
  }
  body = body.replace(NEEDLE, REPLACEMENT);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, body, "utf8");
  console.log(`Wrote patched ${outFile} (${(body.length / 1e6).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
