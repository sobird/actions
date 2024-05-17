/* eslint-disable max-classes-per-file */

// 定义边框样式
const styles = {
  doubleLine: {
    cornerTL: '╔',
    cornerTR: '╗',
    cornerBL: '╚',
    cornerBR: '╝',
    lineH: '═',
    lineV: '║',
    arrow: '\u2b07',
  },
  singleLine: {
    cornerTL: '\u256d',
    cornerTR: '\u256e',
    cornerBL: '\u2570',
    cornerBR: '\u256f',
    lineH: '\u2500',
    lineV: '\u2502',
    arrow: '\u2b07',
  },
  dashedLine: {
    cornerTL: '╔',
    cornerTR: '╗',
    cornerBL: '╚',
    cornerBR: '╝',
    lineH: '╌',
    lineV: '\u2502',
    arrow: '\u2b07',
  },
  noLine: {
    cornerTL: ' ',
    cornerTR: ' ',
    cornerBL: ' ',
    cornerBR: ' ',
    lineH: ' ',
    lineV: ' ',
    arrow: '',
  },
};

class Pad {
  constructor(public outputs: string[], public width: number) {}

  padLeft(centerOnWidth: number = 0) {
    const pad = Math.max(0, (centerOnWidth + this.width) / 2);
    return this.outputs.map((item) => {
      return `${item.padStart(pad)}`;
    }).join('\n');
  }

  toString() {
    return this.outputs.join('\n');
  }
}

export class Pen {
  constructor(public style: keyof typeof styles) {}

  drawArrow() {
    const styleDef = styles[this.style];
    const outputs = [styleDef.arrow];

    return new Pad(outputs, styleDef.arrow.length);
  }

  drawLabels(...labels: string[]) {
    const styleDef = styles[this.style];
    const buf: string[][] = [[], [], []];

    labels.forEach((label) => {
      const bar = `${styleDef.lineH.repeat(label.length + 2)}`;

      buf[0].push(' ');
      buf[0].push(`${styleDef.cornerTL}${bar}${styleDef.cornerTR}`);

      buf[1].push(' ');
      buf[1].push(`${styleDef.lineV} ${label} ${styleDef.lineV}`);

      buf[2].push(' ');
      buf[2].push(`${styleDef.cornerBL}${bar}${styleDef.cornerBR}`);
    });

    let maxWidth = 0;

    const outputs = buf.map((item) => {
      const itemStr = item.join('');
      maxWidth = Math.max(maxWidth, itemStr.length);
      return item.join('');
    });

    return new Pad(outputs, maxWidth);
  }
}
