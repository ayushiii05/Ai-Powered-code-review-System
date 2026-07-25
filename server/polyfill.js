import crypto from 'crypto';

// Polyfill Web Crypto API for older Node versions (like Node 18 on Render)
if (typeof global.crypto === 'undefined') {
  global.crypto = crypto.webcrypto || crypto;
}
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = crypto.webcrypto || crypto;
}
