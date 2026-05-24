export function encodeBase64(bytes: Uint8Array) {
  let result = "";

  for (const value of bytes) {
    result += String.fromCharCode(value);
  }

  return btoa(result);
}

export function decodeBase64(value: string) {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return bytes;
}
