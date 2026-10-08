// Magic-Byte-Pruefung: der beim Upload vom Client gesendete MIME-Type ist
// faelschbar (nur ein HTTP-Header), daher wird hier anhand der tatsaechlichen
// Dateikopf-Bytes verifiziert, dass der Inhalt zum angegebenen Typ passt.

const SIGNATURES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

export function matchesDeclaredType(bytes: Uint8Array, mimeType: string): boolean {
  const signature = SIGNATURES[mimeType];
  if (!signature) return false;
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}
