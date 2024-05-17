/**
 * print table list
 *
 * sobird<i@sobird.me> at 2024/05/17 10:40:47 created.
 */

export function printList(data: Record<string, unknown>[], columns: { title: string, key: string }[] | Record<string, string>) {
  const maxWidth: Record<string, number> = {};

  if (!Array.isArray(columns)) {
    // eslint-disable-next-line no-param-reassign
    columns = Object.entries(columns).map(([key, title]) => {
      return {
        key,
        title,
      };
    });
  }

  columns.forEach((item) => {
    maxWidth[item.key] = item.title.length;
  });

  data.forEach((item) => {
    Object.entries(item).forEach(([key, value]) => {
      maxWidth[key] = Math.max(maxWidth[key], String(value).length);
    });
  });

  const outputs = [];

  outputs.push(columns.map((item) => {
    return item.title.padEnd(maxWidth[item.key]);
  }).join('  '));

  data.forEach((item) => {
    const result = columns.map((col) => {
      return String(item[col.key]).padEnd(maxWidth[col.key]);
    }).join('  ');
    outputs.push(result);
  });

  outputs.forEach((line) => {
    // eslint-disable-next-line no-console
    console.log(line);
  });
}
