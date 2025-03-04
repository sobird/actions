import path from "node:path";

const cwd = path.resolve();


const p1 = path.resolve('/home/runner', cwd);
const p2 = path.resolve('/home/runner');

const p3 = path.posix.resolve('/home/runner', cwd);
const p4 = path.posix.resolve('/home/runner');
const p5 = path.posix.resolve(cwd);

const p6 = path.normalize('/foo/bar//baz/asdf/quux/..');
const p7 = path.posix.normalize('C:\\temp\\\\foo\\bar\\..\\');

const p8 = path.normalize(cwd)



function normalize(pth: string) {
  const normalizedPath = path.normalize(pth).replace(/\\/g, '/');
  if (normalizedPath.startsWith('/mnt/')) {
    return normalizedPath;
  }

  const windowsPathRegex = /^([a-zA-Z]):(\/.*)$/;
  const windowsPathComponents = windowsPathRegex.exec(normalizedPath);

  if (windowsPathComponents === null) {
    return normalizedPath;
  }

  // win32
  const driveLetter = windowsPathComponents[1].toLowerCase();
  const translatedPath = windowsPathComponents[2].replace(/\\/g, '/');
  const result = `/mnt/${driveLetter}${translatedPath}`;

  return result;
}

console.log('cwd', cwd)
console.log('p1', p1)
console.log('p2', p2)
console.log('p3', p3)
console.log('p4', p4)
console.log('p5', p5)
console.log('p6', p6)
console.log('p7', p7)
console.log('p8', p8)

console.log('normalize', normalize("/Github/actions"))