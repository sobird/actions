import { xdgData, xdgConfig, xdgDataDirectories } from 'xdg-basedir';

console.log(xdgData);
//= > '/home/sindresorhus/.local/share'

console.log(xdgConfig);
//= > '/home/sindresorhus/.config'

console.log(xdgDataDirectories);
//= > ['/home/sindresorhus/.local/share', '/usr/local/share/', '/usr/share/']

class Test {
  constructor(public name: string = '') {

  }
}

const test1 = new Test();
const test2 = new Test('');
const test3 = new Test(undefined);
const test4 = new Test('hello');

console.log('first', test1, test2, test3, test4);
