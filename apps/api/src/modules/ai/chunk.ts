export function chunkText(text: string, maxChars = 1500): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      // flush current accumulation first
      if (current.trim()) {
        chunks.push(current.trim());
        current = "";
      }
      // hard-split at word boundary to avoid cutting mid-word
      let remaining = para;
      while (remaining.length > maxChars) {
        const boundary = remaining.lastIndexOf(" ", maxChars);
        const cut = boundary > maxChars * 0.5 ? boundary : maxChars;
        chunks.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut).trimStart();
      }
      if (remaining.trim()) current = remaining;
    } else if (current.length + para.length + 2 > maxChars) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text.trim()];
}
