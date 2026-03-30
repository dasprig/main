/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LAUNCHMYNFT_OWNER_ID?: string;
  readonly VITE_LAUNCHMYNFT_COLLECTION_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  Buffer: typeof Buffer;
  global: Window;
  ownerId?: string;
  collectionId?: string;
  process: {
    version: string;
    env: Record<string, string>;
  };
}
