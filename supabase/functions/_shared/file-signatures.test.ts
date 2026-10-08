import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { matchesDeclaredType } from './file-signatures.ts';

Deno.test('PDF-Signatur wird erkannt', () => {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  assertEquals(matchesDeclaredType(bytes, 'application/pdf'), true);
});

Deno.test('PNG-Datei wird nicht als PDF erkannt', () => {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assertEquals(matchesDeclaredType(bytes, 'application/pdf'), false);
});

Deno.test('unbekannter MIME-Type wird abgelehnt', () => {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
  assertEquals(matchesDeclaredType(bytes, 'application/x-msdownload'), false);
});

Deno.test('zu kurze Datei wird abgelehnt', () => {
  const bytes = new Uint8Array([0x25, 0x50]);
  assertEquals(matchesDeclaredType(bytes, 'application/pdf'), false);
});
