const maxWidth: Record<string, number> = {};

const columns: { title: string, key: string }[] = [
  { title: 'Stage', key: 'stage' },
  { title: 'Job ID', key: 'jobId' },
];
const data: Record<string, unknown>[] = [
  {
    stage: 0,
    jobId: 'unit-test',
  },
  {
    stage: 1,
    jobId: 'release-please',
  },
];

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
  console.log(line);
});
