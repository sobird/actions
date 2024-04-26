export default class SoundPlayer {
  foo: string;

  constructor() {
    this.foo = 'bar';
  }

  // eslint-disable-next-line class-methods-use-this
  playSoundFile(fileName: string) {
    console.log(`Playing sound file ${fileName}`);
  }
}
