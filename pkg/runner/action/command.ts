/**
 * Action Command
 *
 * @see https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
 * @see https://github.com/actions/runner/blob/main/src/Runner.Common/ActionCommand.cs
 * @see https://github.com/actions/toolkit/blob/main/packages/core/src/command.ts
 *
 * sobird<i@sobird.me> at 2024/07/05 14:25:03 created.
 */

class ActionCommand {
  // properties: Record<string, string> = {};

  data: string = '';

  constructor(
    public readonly command: string,
    public readonly properties: Record<string, string> = {},
    public readonly message: string = '',
  ) {}

  toString(): string {
    let cmdStr = ActionCommand.CommandKey + this.command;

    if (this.properties && Object.keys(this.properties).length > 0) {
      cmdStr += ' ';
      let first = true;
      for (const key of Object.keys(this.properties)) {
        if (Object.prototype.hasOwnProperty.call(this.properties, key)) {
          const val = this.properties[key];
          if (val) {
            if (first) {
              first = false;
            } else {
              cmdStr += ',';
            }

            cmdStr += `${key}=${ActionCommand.EscapeProperty(val)}`;
          }
        }
      }
    }

    cmdStr += `${ActionCommand.CommandKey}${ActionCommand.EscapeData(this.message)}`;
    return cmdStr;
  }

  static CommandKey = '::';

  static ToCommandValue(input: any): string {
    if (input === null || input === undefined) {
      return '';
    } if (typeof input === 'string' || input instanceof String) {
      return input as string;
    }
    return JSON.stringify(input);
  }

  static EscapeProperty(s: string): string {
    return this.ToCommandValue(s)
      .replace(/%/g, '%25')
      .replace(/\r/g, '%0D')
      .replace(/\n/g, '%0A')
      .replace(/:/g, '%3A')
      .replace(/,/g, '%2C');
  }

  static EscapeData(s: string): string {
    return this.ToCommandValue(s)
      .replace(/%/g, '%25')
      .replace(/\r/g, '%0D')
      .replace(/\n/g, '%0A');
  }

  static UnescapeProperty(s: string): string {
    return s
      .replaceAll('%0D', '\r')
      .replaceAll('%0A', '\n')
      .replaceAll('%3A', ':')
      .replaceAll('%2C', ',')
      .replaceAll('%25', '%');
  }

  static UnescapeData(s: string): string {
    return s
      .replaceAll('%0D', '\r')
      .replaceAll('%0A', '\n')
      .replaceAll('%25', '%');
  }

  static Parse(message?: string, registeredCommands: Set<string> = new Set()) {
    if (!message) {
      return null;
    }
    // the message needs to start with the keyword after trim leading space.
    // eslint-disable-next-line no-param-reassign
    message = message.trimStart();
    if (!message.startsWith(this.CommandKey)) {
      return null;
    }
    const endIndex = message.indexOf(this.CommandKey, this.CommandKey.length);
    if (endIndex < 0) {
      return null;
    }
    // Get the command info (command and properties).
    const cmdIndex = this.CommandKey.length;
    const cmdInfo = message.substring(cmdIndex, endIndex);

    // Get the command name
    const spaceIndex = cmdInfo.indexOf(' ');
    const commandName = spaceIndex < 0 ? cmdInfo : cmdInfo.substring(0, spaceIndex);

    if (!registeredCommands.has(commandName)) {
      return null;
    }

    // Set the properties.
    const properties: Record<string, string> = {};
    if (spaceIndex > 0) {
      const propertiesStr = cmdInfo.substring(spaceIndex + 1).trim();

      // RemoveEmptyEntries
      const splitProperties = propertiesStr.split(',').filter((item) => { return item; });

      for (const propertyStr of splitProperties) {
        // RemoveEmptyEntries
        const pair = propertyStr.split('=').filter((item) => { return item; });

        if (pair.length >= 2) {
          const [key, ...value] = pair;
          properties[key] = this.UnescapeProperty(value.join('='));
        }
      }
    }

    const data = this.UnescapeData(message.substring(endIndex + this.CommandKey.length));
    return new ActionCommand(commandName, properties, data);
  }
}

export default ActionCommand;
