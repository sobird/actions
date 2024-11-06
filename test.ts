let expression = 'ddd ${{ inputs.who-to-greet }}';

expression = expression.replace(/(?:\w+)(?:\.[\w-]+)+/g, (a) => {
  const [first, ...parts] = a.split('.');

  const output = parts.map((item) => {
    return `['${item}']`;
  });
  output.unshift(first);

  return output.join('');
});

console.log('expression:', expression);
