import { Buffer } from 'buffer';

// @ts-expect-error - Adding global to window for Solana compatibility
window.global = window;
window.Buffer = Buffer;

// @ts-expect-error - Adding process to window for Node.js polyfill
window.process = {
  version: '',
  env: {},
};

export {}; 