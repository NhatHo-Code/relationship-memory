interface Piece {
  text: string;
  sep: string;
}

function splitByWord(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let rest = text.trim();
  while (rest.length > maxChars) {
    let cut = maxChars;
    for (let i = maxChars; i > maxChars * 0.5; i--) {
      if (/\s/.test(rest[i] ?? "")) {
        cut = i;
        break;
      }
    }
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

function splitBySentence(paragraph: string): string[] {
  return paragraph.match(/[^.!?。…]+[.!?。…]*["')\]]*\s*/g) ?? [paragraph];
}

function toPieces(paragraph: string, maxChars: number): Piece[] {
  if (paragraph.length <= maxChars) return [{ text: paragraph, sep: "\n\n" }];
  return splitBySentence(paragraph)
    .flatMap((s) => (s.length <= maxChars ? [s.trim()] : splitByWord(s, maxChars)))
    .filter(Boolean)
    .map((text, i) => ({ text, sep: i === 0 ? "\n\n" : " " }));
}

// Paragraph -> sentence -> word -> char: split at the coarsest boundary that fits.
export function chunkText(text: string, maxChars = 1500): string[] {
  const pieces = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => toPieces(p, maxChars));

  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    const candidate = current ? current + piece.sep + piece.text : piece.text;
    if (candidate.length > maxChars) {
      chunks.push(current);
      current = piece.text;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text.trim()];
}
