export function createSafeName(...parts: string[]) {
  const pattern = /[^a-zA-Z0-9-]/g;
  const name = parts.map((part) => {
    let v = part.replace(pattern, '-');
    v = v.replace(/^-+|-+$/g, '');
    v = v.replaceAll(/--+/g, '-');
    return v;
  }).filter((part) => { return part; });
  return name.join('-');
}
