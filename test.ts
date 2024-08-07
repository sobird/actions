import { xdgData, xdgConfig, xdgDataDirectories } from 'xdg-basedir';

console.log(xdgData);
//= > '/home/sindresorhus/.local/share'

console.log(xdgConfig);
//= > '/home/sindresorhus/.config'

console.log(xdgDataDirectories);
//= > ['/home/sindresorhus/.local/share', '/usr/local/share/', '/usr/share/']
