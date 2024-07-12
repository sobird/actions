import net from 'node:net';
import url from 'node:url';

const ipv6Url = 'http://192.168.1.100';
const parsed = url.parse(ipv6Url);

console.log('parsed', parsed);

console.log('parsed', new URL(ipv6Url));
