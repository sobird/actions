import log4js from 'log4js';

import Constants from '@/pkg/common/constants';
import type Runner from '@/pkg/runner';

import ActionCommand from '.';
import extensions from './extensions';

const logger = log4js.getLogger();

class ActionCommandManager {
  private registeredCommands: Set<string>;

  private stopProcessCommand: boolean = false;

  private stopCommand = 'stop-commands';

  private stopToken = '';

  constructor(public runner: Runner) {
    this.registeredCommands = new Set(Object.keys(extensions));
    this.registeredCommands.add(this.stopCommand);
  }

  async process(line: string) {
    const { runner } = this;
    if (!line) {
      return;
    }

    const actionCommand = ActionCommand.Parse(line, this.registeredCommands);

    if (!actionCommand) {
      return;
    }

    if (!runner.EnhancedAnnotationsEnabled && actionCommand.command === 'notice') {
      logger.debug("Enhanced Annotations not enabled on the server: 'notice' command will not be processed.");
      return false;
    }

    if (this.stopProcessCommand) {
      if (this.stopToken && actionCommand.command === this.stopToken) {
        console.debug('Resume processing commands');
        this.registeredCommands.delete(this.stopToken);
        this.stopProcessCommand = false;
        this.stopToken = '';
        return true;
      }
      console.debug(`Process commands has been stopped and waiting for '##[${this.stopToken}]' to resume.`);
      return false;
    } if (actionCommand.command === this.stopCommand) {
      this.validateStopToken(actionCommand.data);
      this.stopToken = actionCommand.data;
      this.stopProcessCommand = true;
      this.registeredCommands.add(this.stopToken);

      if (this.stopToken.length > 6) {
        runner.addMask(this.stopToken);
      }

      console.debug(('Paused processing commands until the token you called ::stopCommands:: with is received'));
      return true;
    } if (extensions[actionCommand.command]) {
      const extension = extensions[actionCommand.command];
      if (runner.echoOnActionCommand && extension.echo) {
        // context.Output(input);
        console.log(line);
      }
      try {
        await extension.process(this.runner, actionCommand);
      } catch (err) {
        const commandInformation = extension.echo ? line : extension.command;
        const message = `Unable to process command '${commandInformation}' successfully.`;
        runner.error(message);
        // console.error(err);
        // context.Error(ex);
        // context.CommandResult = TaskResult.Failed;
      }
    } else {
      // Command not found
      console.warn(`Can't find command extension for ##[${actionCommand.command}.command].`);
    }

    return true;
  }

  validateStopToken(stopToken: string) {
    const { AllowUnsupportedStopCommandTokens } = Constants.Actions;
    const allowUnsecureStopCommandTokens = process.env[AllowUnsupportedStopCommandTokens]?.toLowerCase() === 'true' || this.runner.context.env[AllowUnsupportedStopCommandTokens]?.toLowerCase() === 'true' || false;

    const isTokenInvalid = this.registeredCommands.has(stopToken) || !stopToken || stopToken.toLowerCase() === 'pause-logging';

    if (isTokenInvalid) {
      const message = `Invoked ::stopCommand:: with token: [${stopToken}]`;
      console.log(message); // todo
    }

    if (isTokenInvalid && !allowUnsecureStopCommandTokens) {
      throw new Error(Constants.Runner.UnsupportedStopCommandTokenDisabled);
    }
  }
}

export default ActionCommandManager;
