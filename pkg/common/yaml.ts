import fs from 'node:fs';

import { parse, stringify } from 'yaml';

import { isEmptyDeep } from '@/utils';

class Yaml {
  #yaml;

  constructor(yaml: Yaml) {
    this.#yaml = yaml;
  }

  save(path: string, options?: Parameters<typeof stringify>[1]) {
    fs.writeFileSync(path, this.dump(options));
  }

  dump<T extends Parameters<typeof stringify>[1]>(options?: T) {
    return stringify(JSON.parse(JSON.stringify(this, (key, value) => {
      if (isEmptyDeep(value)) {
        return undefined;
      }
      return value;
    })), {
      lineWidth: 150,
      ...options,
    } as unknown as T);
  }

  static Read(path: string, options?: Parameters<typeof parse>[2]) {
    const doc = parse(fs.readFileSync(path, 'utf8'), options);
    return new this(doc as Yaml);
  }

  static Load(str: string, options?: Parameters<typeof parse>[2]) {
    const doc = parse(str, options);
    return new this(doc as Yaml);
  }
}

export default Yaml;
