#!/usr/bin/env node
// Makes one Life Emoji unlock code, signed with your private key.
//
//   npm run unlock:code                       uses ./umr-unlock-private.pem
//   npm run unlock:code -- /path/to/key.pem   uses another path
//   UMR_UNLOCK_KEY=/path/to/key.pem npm run unlock:code
//
// Keep the private key OFF GitHub and backed up somewhere safe. Anyone with it can make codes.
// Log each code's ID next to the buyer and payment, so you can trace a refund or a leaked code.
import { createPrivateKey, randomBytes, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const CONTEXT = 'umr-life-emoji-v1:';
const keyPath = process.argv[2] || process.env.UMR_UNLOCK_KEY || './umr-unlock-private.pem';

let key;
try {
  key = createPrivateKey(readFileSync(keyPath));
} catch {
  console.error(`Can't read the private key at ${keyPath}.`);
  process.exit(1);
}

const id = randomBytes(8);
const sig = sign('sha256', Buffer.concat([Buffer.from(CONTEXT), id]), { key, dsaEncoding: 'ieee-p1363' });
const code = 'UMR1-' + Buffer.concat([id, sig]).toString('base64url');

console.log(code);
console.error(`Code ID: ${id.toString('hex')}  (record this with the buyer and payment)`);
