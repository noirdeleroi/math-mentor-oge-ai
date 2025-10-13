// utils/getSelectedTextWithMath.ts
export function getSelectedTextWithMath(): string {
  const sel = window.getSelection?.();
  if (!sel || sel.rangeCount === 0) return '';

  // Try to extract TeX from selected MathJax CHTML if present
  try {
    const range = sel.getRangeAt(0);
    const fragment = range.cloneContents();
    const containers = Array.from(fragment.querySelectorAll?.('mjx-container') ?? []) as HTMLElement[];

    const texBits: string[] = [];
    containers.forEach(c => {
      const tex = c.getAttribute('data-tex'); // set by your MathJaxManager tagger
      if (tex && tex.trim()) texBits.push(tex.trim());
    });

    // If we found TeX, prefer that (joined with spaces)
    if (texBits.length > 0) {
      return texBits.join(' ');
    }
  } catch {
    // ignore and fallback
  }

  // ✅ Fallback: plain selected text (works before MathJax tags exist or in different DOMs)
  return sel.toString();
}
