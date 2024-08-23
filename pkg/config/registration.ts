/**
 * 配置的注册信息 数据持久化
 *
 * sobird<i@sobird.me> at 2024/04/23 15:50:54 created.
 */

import fs from 'fs';

const WARNING = 'This file is automatically generated by runner. Do not edit it manually unless you know what you are doing. Removing this file will cause runner to re-register as a new runner.';

export class Registration {
  public id: string;

  public uuid: string;

  public name: string;

  public token: string;

  public address: string;

  public labels: string[];

  #file: string = '.runner';

  public WARNING: string = WARNING;

  constructor(registration: Registration) {
    this.id = registration.id;
    this.uuid = registration.uuid;
    this.name = registration.name;
    this.token = registration.token;
    this.address = registration.address;
    this.labels = registration.labels ?? [];
  }

  get file() {
    return this.#file;
  }

  save() {
    // Convert the object to a JSON string with 2-space indentation
    fs.writeFileSync(this.#file, JSON.stringify(this, null, 2), 'utf8');
  }

  static Load(file: string) {
    let register = {} as Registration;
    if (fs.existsSync(file)) {
      register = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    const registration = new Registration(register);
    registration.#file = file;

    return registration;
  }
}
