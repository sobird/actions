import LineWritable from '@/pkg/common/lineWritable';

export function createWriteLineStream(...fns: ((line: string) => boolean | void)[]) {
  return new LineWritable({
    highWaterMark: 1,
    objectMode: true,
  }).on('line', (line) => {
    for (const fn of fns) {
      if (fn(line) === false) {
        break;
      }
    }
  });
}
