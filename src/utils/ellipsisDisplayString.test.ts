import { ellipsisDisplayString } from './ellipsisDisplayString';

describe('ellipsisDisplayString', () => {
  it('returns the string untouched when it fits', () => {
    expect(ellipsisDisplayString('a'.repeat(10), 255)).toBe('a'.repeat(10));
    expect(ellipsisDisplayString('a', 1)).toBe('a');
  });

  it('truncates ASCII and appends an ellipsis', () => {
    expect(ellipsisDisplayString('a'.repeat(20), 10)).toBe('aaaaaaa…');
    expect(ellipsisDisplayString('abcdefghijkl', 11)).toBe('abcdefgh…');
  });

  it('keeps a short remainder instead of adding an ellipsis', () => {
    // the remaining 4 CJK runes fit within the limit, so nothing is dropped
    expect(ellipsisDisplayString('日本語で', 9)).toBe('日本語で');
    expect(ellipsisDisplayString('日本語', 6)).toBe('日本語');
  });

  it('counts CJK and emoji as two ASCII widths', () => {
    expect(ellipsisDisplayString('日'.repeat(100), 10)).toBe('日日日…');
    expect(ellipsisDisplayString('😀'.repeat(10), 5)).toBe('😀…');
  });

  it('drops the ellipsis when the limit is too small for it', () => {
    expect(ellipsisDisplayString('a'.repeat(10), 3)).toBe('…');
    expect(ellipsisDisplayString('abc', 2)).toBe('');
    expect(ellipsisDisplayString('日本', 2)).toBe('');
  });
});
