/**
 * 配置的注册信息 数据持久化
 *
 * sobird<i@sobird.me> at 2024/04/23 15:50:54 created.
 */

import fs from 'fs';

const Warning = 'This file is automatically generated by act-runner. Do not edit it manually unless you know what you are doing. Removing this file will cause act runner to re-register as a new runner.';

export class Registration {
  constructor(
    public id: string,
    public uuid: string,
    public name: string,
    public toke: string,
    public address: string,
    public labels: string[],
    public WARNING: string = Warning,
  ) {}

  save(file: string) {
    // Convert the object to a JSON string with 2-space indentation
    const data = JSON.stringify(this, null, 2);
    fs.writeFileSync(file, data, 'utf8');
  }

  static load(file: string) {
    if (!fs.existsSync(file)) {
      return null;
    }
    try {
      const reg = JSON.parse(fs.readFileSync(file, 'utf8'));
      return new Registration(reg.id, reg.uuid, reg.name, reg.token, reg.address, reg.labels);
    } catch (err) {
      return null;
    }
  }
}
