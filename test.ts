import dotenv from 'dotenv';

const content = `
sobird=2
hello=2
`;

const config = dotenv.parse(content);
console.log('config', config);
