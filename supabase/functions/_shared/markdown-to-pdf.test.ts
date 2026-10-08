import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { wrapText } from './markdown-to-pdf.ts';

// Simuliert eine monospace-aehnliche Breitenmessung (1 Einheit pro Zeichen),
// damit der Umbruch-Algorithmus ohne echte PDF-Schrift testbar ist.
const measure = (s: string) => s.length;

Deno.test('wrapText bricht an Wortgrenzen um, wenn die Breite ueberschritten wird', () => {
  const lines = wrapText('eins zwei drei vier', 9, measure);
  assertEquals(lines, ['eins zwei', 'drei vier']);
});

Deno.test('wrapText gibt einzeiligen Text unverändert zurück, wenn er passt', () => {
  const lines = wrapText('kurzer text', 100, measure);
  assertEquals(lines, ['kurzer text']);
});

Deno.test('wrapText reisst auch ein einzelnes zu langes Wort nicht ab (overflow erlaubt)', () => {
  const lines = wrapText('einzelnessehrlangeswort', 5, measure);
  assertEquals(lines, ['einzelnessehrlangeswort']);
});

Deno.test('wrapText ignoriert mehrfache Leerzeichen', () => {
  const lines = wrapText('eins   zwei', 100, measure);
  assertEquals(lines, ['eins zwei']);
});
