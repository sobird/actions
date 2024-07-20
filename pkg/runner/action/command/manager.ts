import log4js from 'log4js';

import Constants from '@/pkg/common/constants';
import Runner from '@/pkg/runner';

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

  process(line: string) {
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
      console.log(this.stopToken, actionCommand.command);
      if (this.stopToken && actionCommand.command === this.stopToken) {
        console.debug('Resume processing commands');
        this.registeredCommands.delete(this.stopToken);
        this.stopProcessCommand = false;
        this.stopToken = '';
      }
    } else if (actionCommand.command === this.stopCommand) {
      console.log('121212', 121212, actionCommand);
      this.validateStopToken(actionCommand.data);
      this.stopToken = actionCommand.data;
      this.stopProcessCommand = true;
      this.registeredCommands.add(this.stopToken);

      if (this.stopToken.length > 6) {
        // HostContext.SecretMasker.AddValue(_stopToken);
      }

      console.debug(('Paused processing commands until the token you called ::stopCommands:: with is received'));
      return true;
    } else if (extensions[actionCommand.command]) {
      const extension = extensions[actionCommand.command];
      if (runner.EchoOnActionCommand && extension.echo) {
        // context.Output(input);
        console.log(line);
      }
      try {
        extension.process(this.runner, actionCommand);
      } catch (err) {
        const commandInformation = extension.echo ? line : extension.command;
        const message = `Unable to process command '${commandInformation}' successfully.`;
        console.error(message);
        console.error(err);
        // context.Error(ex);
        // context.CommandResult = TaskResult.Failed;
      }
    } else {
      // Command not found
      console.warn(`Can't find command extension for ##[${actionCommand.command}.command].`);
    }
  }

  validateStopToken(stopToken: string) {
    console.log('stopToken', stopToken);
    const { AllowUnsupportedStopCommandTokens } = Constants.Variables.Actions;
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
