// Sehr einfacher Markdown-zu-PDF-Renderer fuer den generierten Leitfaden.
// Bewusst kein HTML-Rendering (keine Headless-Browser-Abhaengigkeit in der
// Edge Function) -- nur Ueberschriften (#, ##) und Fliesstext mit Zeilenumbruch.

import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

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

export async function renderMarkdownToPdf(markdown: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 56;
  const contentWidth = pageWidth - margin * 2;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function ensureSpace(lineHeight: number) {
    if (y - lineHeight < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  function drawLine(text: string, size: number, useFont: typeof font) {
    const lineHeight = size * 1.4;
    ensureSpace(lineHeight);
    page.drawText(text, { x: margin, y, size, font: useFont, color: rgb(0.1, 0.1, 0.1) });
    y -= lineHeight;
  }

  for (const block of parseMarkdown(markdown)) {
    if (block.kind === 'blank') {
      y -= 8;
      continue;
    }
    if (block.kind === 'h1') {
      y -= 8;
      drawLine(block.text, 20, boldFont);
      y -= 4;
      continue;
    }
    if (block.kind === 'h2') {
      y -= 6;
      drawLine(block.text, 14, boldFont);
      y -= 2;
      continue;
    }
    const size = 11;
    const lines = wrapText(block.text, contentWidth, (s) => font.widthOfTextAtSize(s, size));
    for (const line of lines) {
      drawLine(line, size, font);
    }
  }

  return pdf.save();
}
