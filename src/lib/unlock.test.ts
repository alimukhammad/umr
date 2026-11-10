import { execFileSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifyCode, verifyCodeWith } from './unlock';

// A throwaway key pair, so no real unlock code ever sits in the repo.
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const dir = mkdtempSync(join(tmpdir(), 'umr-'));
const keyFile = join(dir, 'k.pem');
writeFileSync(keyFile, privateKey.export({ type: 'pkcs8', format: 'pem' }));
const jwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;
const make = () => execFileSync('node', ['tools/make-unlock-code.mjs', keyFile], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();

describe('unlock codes', () => {
  it('accepts a code made by the tool', async () => {
    const code = make();
    expect(code).toMatch(/^UMR1-[A-Za-z0-9_-]{96}$/);
    expect(await verifyCodeWith(jwk, code)).toBe(true);
  });
  it('accepts a code with spaces and line breaks from an email', async () => {
    const code = make();
    const messy = `  ${code.slice(0, 40)}\n ${code.slice(40)}  `;
    expect(await verifyCodeWith(jwk, messy)).toBe(true);
  });
  it('rejects a changed code', async () => {
    const code = make();
    const last = code[code.length - 1] === 'A' ? 'B' : 'A';
    expect(await verifyCodeWith(jwk, code.slice(0, -1) + last)).toBe(false);
  });
  it('rejects junk', async () => {
    expect(await verifyCodeWith(jwk, 'hello')).toBe(false);
    expect(await verifyCodeWith(jwk, 'UMR1-abc')).toBe(false);
  });
  it('rejects a code signed with another key than the app’s', async () => {
    expect(await verifyCode(make())).toBe(false);
  });
});
