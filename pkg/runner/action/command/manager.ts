import log4js from 'log4js';

import Runner from '@/pkg/runner';

import ActionCommand from '.';
import extensions from './extensions';

const logger = log4js.getLogger();

class ActionCommandManager {
  private registeredCommands: Set<string>;

  private stopProcessCommand: boolean = false;

  private stopToken = '';

  constructor(public runner: Runner) {
    this.registeredCommands = new Set(Object.keys(extensions));
  }

  process(line: string) {
    if (!line) {
      return;
    }

    const actionCommand = ActionCommand.Parse(line, this.registeredCommands);
    if (!actionCommand) {
      return;
    }

    if (!this.enhancedAnnotationsEnabled() && actionCommand.command === 'notice') {
      logger.debug("Enhanced Annotations not enabled on the server: 'notice' command will not be processed.");
      return false;
    }

    const test = 123;

    if (this.stopProcessCommand) {
      if (!this.stopToken && actionCommand.command === this.stopToken) {
        logger.debug('Resume processing commands');
      }
    }
  }

  enhancedAnnotationsEnabled() {
    return !!this.runner.context.vars['DistributedTask.EnhancedAnnotations'];
  }
}

export default ActionCommandManager;
