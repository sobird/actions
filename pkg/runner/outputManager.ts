/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */

import type Runner from '.';
import ActionCommandManager from './action/command/manager';

export default class OutputManager {
  constructor(public runner: Runner, public actionCommandManager = new ActionCommandManager(runner)) {}

  onLine(line: string) {
    this.actionCommandManager.process(line);
  }
}
