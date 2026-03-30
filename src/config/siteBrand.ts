/** Public site name (edit here to rebrand). */
export const SITE_DISPLAY_NAME = "Sprig";

export const SITE_NAME_LOWER = SITE_DISPLAY_NAME.toLowerCase();

export const LAUNCHMYNFT_SCRIPT_VERSION = "0.1.4";

export const LAUNCHMYNFT_BASE = `https://storage.googleapis.com/scriptslmt/${LAUNCHMYNFT_SCRIPT_VERSION}`;

/** Patched bundle from scripts/vendor-launchmynft-solana.mjs (fixes currencyMint for SOL mints) */
export const LAUNCHMYNFT_SOLANA_JS_PATH = `/launchmynft/${LAUNCHMYNFT_SCRIPT_VERSION}/solana.js`;

export const LAUNCHMYNFT_OWNER_ID =
  import.meta.env.VITE_LAUNCHMYNFT_OWNER_ID ??
  "JAiuDJzTSyvSVQR4Uvk2YhdZtbE1QnWduHtBnTspuCdj";

export const LAUNCHMYNFT_COLLECTION_ID =
  import.meta.env.VITE_LAUNCHMYNFT_COLLECTION_ID ?? "qIGcJS1IZCmcGSD2JNTk";
