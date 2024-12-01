export class Status {
  constructor() {

  }

  static get Unknown() {
    return new this();
  }

  toString() {
    return 'ddd';
  }
}

console.log('first', Status.Unknown);
