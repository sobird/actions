import fs from 'node:fs';

import { parse, stringify } from 'yaml';

class Yaml {
  #yaml;

  constructor(yaml: Omit<Yaml, 'save' | 'dump'>) {
    this.#yaml = structuredClone(yaml);
  }

  save(file: string, options?: Parameters<typeof stringify>[1]) {
    fs.writeFileSync(file, this.dump(options));
  }

  dump<T extends Parameters<typeof stringify>[1]>(options?: T) {
    return stringify(this.#yaml, {
      lineWidth: 150,
      ...options,
    } as unknown as T);
  }

  static Read<T extends typeof Yaml>(this: T, file: string, options?: Parameters<typeof parse>[2]) {
    const doc = parse(fs.readFileSync(file, 'utf8'), options);
    return new this(doc) as InstanceType<T>;
  }

  static Load<T extends { new (...args: any[]): Yaml }>(this: T, str: string, options?: Parameters<typeof parse>[2]) {
    const doc = parse(str, options);
    return new this(doc) as InstanceType<T>;
  }
}

export default Yaml satisfies any;
