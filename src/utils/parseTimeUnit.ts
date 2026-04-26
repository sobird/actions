const units = {
  μs: 1,
  ms: 1000,
  s: 1000 * 1000,
  m: 1000 * 1000 * 60,
  h: 1000 * 1000 * 60 * 60,
  d: 1000 * 1000 * 60 * 60 * 24,
  w: 1000 * 1000 * 60 * 60 * 24 * 7,
};

function getMicroseconds(value: number, unit: keyof typeof units) {
  const result = units[unit];

  if (result) {
    return value * result;
  }

  return value;
}

export function parseTimeUnit(timeString: string, returnUnit: keyof typeof units = 'ms') {
  let totalMicroseconds = 0;

  const groups = timeString.toLowerCase().match(/[-+]?[0-9.]+[a-z]+/g);

  if (groups !== null) {
    groups.forEach((g) => {
      const matches = g.match(/(\d+)(μs|ms|s|m|h|d|w)/);
      if (!matches) {
        return;
      }
      const amount = parseInt(matches[1], 10);
      const unit = matches[2];

      totalMicroseconds += getMicroseconds(amount, unit as keyof typeof units);
    });
  }

  return totalMicroseconds / units[returnUnit];
}
