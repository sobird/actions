/**
 * Truncate a string for display, appending an ellipsis when it does not fit.
 *
 * Port of gitea's util.EllipsisDisplayString (`modules/util/truncate.go`).
 */

/**
 * Guess the display width of a code point, in ASCII widths.
 *
 * CJK and emoji are counted as 2 rather than their 3-4 byte width so the
 * truncated string stays as long as possible. The width is never 0: the result is
 * also used as a database value, where every character counts as at least one.
 */
function guessWidth(char: string): number {
  const codePoint = char.codePointAt(0)!;
  if (codePoint <= 255) {
    return 1;
  }
  if (codePoint === 0x3000) {
    // ideographic space, still 2
    return 2;
  }
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
    // Cs (surrogate)
    return 1;
  }
  // M (Mark), Cf (Other, format), Z (Space)
  if (/[\p{M}\p{Cf}\p{Z}]/u.test(char)) {
    return 1;
  }
  return 2;
}

/**
 * @param str the string to truncate
 * @param limit approximate display width, in ASCII widths, to fit into
 */
export function ellipsisDisplayString(str: string, limit: number): string {
  const totalBytes = Buffer.byteLength(str, 'utf8');
  if (totalBytes <= limit) {
    return str;
  }

  const chars = Array.from(str);
  const sizes = chars.map((char) => Buffer.byteLength(char, 'utf8'));

  /** byte offset of `chars[index]`; the start of the part left untruncated */
  let pos = 0;
  let index = 0;
  let used = 0;
  let kept = 0;
  let bytes = 0;

  for (let i = 0; i < chars.length; i += 1) {
    pos = bytes;
    index = i;
    const width = guessWidth(chars[i]);
    if (used + width + 3 > limit) {
      break;
    }
    used += width;
    bytes += sizes[i];
    kept += 1;
  }

  // Fewer than three runes left over is not worth an ellipsis: keep everything
  // when the whole string still fits.
  if (totalBytes - pos <= 12) {
    let nextCnt = 0;
    let nextWidth = 0;
    for (let i = index; i < chars.length && nextCnt < 4; i += 1) {
      nextWidth += guessWidth(chars[i]);
      nextCnt += 1;
    }
    if (nextCnt <= 3 && used + nextWidth <= limit) {
      return str;
    }
  }

  if (limit < 3) {
    // too small for an ellipsis
    return chars.slice(0, kept).join('');
  }

  // A JS string always holds valid code points, so upstream's ASCII "..." fallback
  // for invalid UTF-8 is unreachable here.
  return `${chars.slice(0, kept).join('')}…`;
}

export default ellipsisDisplayString;
