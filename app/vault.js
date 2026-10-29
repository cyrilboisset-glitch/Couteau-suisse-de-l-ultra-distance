// Base chiffrée de la version mobile : la base est livrée compressée et chiffrée (AES-GCM),
// puis déchiffrée en mémoire au lancement. Ce n'est pas inviolable (la clé est dans l'appli),
// mais cela empêche la copie directe de la base depuis l'APK.
// __VAULT_KEY__ est injecté au build mobile (scripts/build-mobile.js) ; absent ailleurs.

const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function openVault({ iv, data }) {
  // eslint-disable-next-line no-undef
  const parts = typeof __VAULT_KEY__ === 'undefined' ? null : __VAULT_KEY__;
  if (!parts) throw new Error('vault');
  const raw = new Uint8Array(32);
  parts.forEach((p, i) => fromB64(p).forEach((b, j) => { raw[i * 8 + j] = b ^ (0x5a + i * 17 + j); }));
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const gz = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(data));
  const json = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  return JSON.parse(json);
}
