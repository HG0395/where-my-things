const encoder = new TextEncoder();
function bytesToBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}
function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
async function masterKey(secret: string) {
  const bytes = base64ToBytes(secret);
  if (bytes.length !== 32)
    throw new Error("Encryption configuration is invalid");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function encryptKey(
  raw: string,
  ownerId: string,
  version: string,
  secret: string,
) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: encoder.encode(`${ownerId}:${version}`),
    },
    await masterKey(secret),
    encoder.encode(raw),
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
}
export async function decryptKey(
  ciphertext: string,
  iv: string,
  ownerId: string,
  version: string,
  secret: string,
) {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(iv),
      additionalData: encoder.encode(`${ownerId}:${version}`),
    },
    await masterKey(secret),
    base64ToBytes(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}
export async function fingerprint(
  bytes: Uint8Array,
  model: string,
  version: string,
) {
  const prefix = encoder.encode(`inventory-v1:${model}:${version}:`);
  const input = new Uint8Array(prefix.length + bytes.length);
  input.set(prefix);
  input.set(bytes, prefix.length);
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", input)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
