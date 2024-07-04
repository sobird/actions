class RunContext {
  ExtraPath: string[] = [];

  addPath(arg: string) {
    console.log(`::add-path:: ${arg}`);
    const extraPath = [arg];
    for (const v of this.ExtraPath) {
      if (v !== arg) {
        extraPath.push(v);
      }
    }
    this.ExtraPath = extraPath;
  }
}

const runner = new RunContext();

runner.addPath('abc');
runner.addPath('123');
runner.addPath('abc');

console.log('first', runner.ExtraPath);
