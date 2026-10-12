// Markdown-zu-PDF-Renderer fuer den generierten Leitfaden. Bewusst kein
// HTML-Rendering (keine Headless-Browser-Abhaengigkeit in der Edge Function)
// -- nur Ueberschriften (#, ##) und Fliesstext, dafuer mit Logo-Header,
// Markenfarbe und Seiten-Fusszeile fuer einen weniger kargen Eindruck.

import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { LOGO_PNG_BASE64 } from './logo-asset.ts';

export function wrapText(
  text: string,
  maxWidth: number,
  measureWidth: (segment: string) => number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureWidth(candidate) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface Block {
  kind: 'h1' | 'h2' | 'p' | 'blank';
  text: string;
}

function parseMarkdown(markdown: string): Block[] {
  return markdown.split('\n').map((line) => {
    if (line.startsWith('# ')) return { kind: 'h1', text: line.slice(2) };
    if (line.startsWith('## ')) return { kind: 'h2', text: line.slice(3) };
    if (line.trim() === '') return { kind: 'blank', text: '' };
    return { kind: 'p', text: line };
  });
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Farben passend zum Marken-Blau der Web-App (Tailwind brand-500 #465FFF).
const BRAND = rgb(0.2745, 0.3725, 1);
const HEADING = rgb(0.1216, 0.1608, 0.2157); // gray-800
const BODY = rgb(0.2667, 0.3059, 0.349); // gray-700
const MUTED = rgb(0.6118, 0.6392, 0.6863); // gray-400
const HAIRLINE = rgb(0.9, 0.9, 0.92);

export async function renderMarkdownToPdf(markdown: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logoImage = await pdf.embedPng(base64ToBytes(LOGO_PNG_BASE64));

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 56;
  const contentWidth = pageWidth - margin * 2;

  const logoWidth = 84;
  const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
  const headerBottom = pageHeight - margin - logoHeight - 14;
  const footerTop = margin + 28;

  // deno-lint-ignore no-explicit-any
  const pages: any[] = [];

  function addPage() {
    const p = pdf.addPage([pageWidth, pageHeight]);
    p.drawImage(logoImage, {
      x: margin,
      y: pageHeight - margin - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
    p.drawLine({
      start: { x: margin, y: headerBottom },
      end: { x: pageWidth - margin, y: headerBottom },
      thickness: 1,
      color: HAIRLINE,
    });
    pages.push(p);
    return p;
  }

  let page = addPage();
  let y = headerBottom - 30;

  function ensureSpace(lineHeight: number) {
    if (y - lineHeight < footerTop) {
      page = addPage();
      y = headerBottom - 30;
    }
  }

  function drawLine(text: string, size: number, useFont: typeof font, color = BODY) {
    const lineHeight = size * 1.55;
    ensureSpace(lineHeight);
    page.drawText(text, { x: margin, y, size, font: useFont, color });
    y -= lineHeight;
  }

  for (const block of parseMarkdown(markdown)) {
    if (block.kind === 'blank') {
      y -= 8;
      continue;
    }
    if (block.kind === 'h1') {
      y -= 6;
      ensureSpace(34);
      page.drawText(block.text, { x: margin, y, size: 22, font: boldFont, color: BRAND });
      y -= 26;
      page.drawLine({
        start: { x: margin, y: y + 10 },
        end: { x: margin + 56, y: y + 10 },
        thickness: 3,
        color: BRAND,
      });
      y -= 10;
      continue;
    }
    if (block.kind === 'h2') {
      y -= 14;
      ensureSpace(22);
      page.drawRectangle({ x: margin, y: y + 3, width: 7, height: 7, color: BRAND });
      page.drawText(block.text, { x: margin + 15, y, size: 13, font: boldFont, color: HEADING });
      y -= 22;
      continue;
    }
    const size = 10.5;
    const lines = wrapText(block.text, contentWidth, (s) => font.widthOfTextAtSize(s, size));
    for (const line of lines) {
      drawLine(line, size, font, BODY);
    }
  }

  const total = pages.length;
  // deno-lint-ignore no-explicit-any
  pages.forEach((p: any, idx: number) => {
    p.drawLine({
      start: { x: margin, y: footerTop - 14 },
      end: { x: pageWidth - margin, y: footerTop - 14 },
      thickness: 1,
      color: HAIRLINE,
    });
    p.drawText('Automatisiert erstellte Selbsteinschätzung – ersetzt keine Begutachtung.', {
      x: margin,
      y: footerTop - 28,
      size: 8,
      font,
      color: MUTED,
    });
    const pageLabel = `Seite ${idx + 1} von ${total}`;
    const labelWidth = font.widthOfTextAtSize(pageLabel, 8);
    p.drawText(pageLabel, {
      x: pageWidth - margin - labelWidth,
      y: footerTop - 28,
      size: 8,
      font,
      color: MUTED,
    });
  });

  return pdf.save();
}
