// Prints a fresh Ed25519 key pair for the unlock token. Copy the values into Cloudflare env vars; never commit them.
import { webcrypto as c } from 'node:crypto';
const b64u = (u) => Buffer.from(u).toString('base64url');
const { publicKey, privateKey } = await c.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
console.log('UNLOCK_SIGNING_KEY=' + b64u(await c.subtle.exportKey('pkcs8', privateKey)));
console.log('PUBLIC_UNLOCK_VERIFY_KEY=' + b64u(await c.subtle.exportKey('raw', publicKey)));
