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
  properties: Record<string, string> = {};

  data: string = '';

  constructor(public command: string) {}

  static CommandKey = '::';

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

  static Parse(message: string, registeredCommands: Set<string>) {
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

    // Initialize the command.
    const command = new ActionCommand(commandName);

    // Set the properties.
    if (spaceIndex > 0) {
      const propertiesStr = cmdInfo.substring(spaceIndex + 1).trim();

      // RemoveEmptyEntries
      const splitProperties = propertiesStr.split(',').filter((item) => { return item; });

      for (const propertyStr of splitProperties) {
        // RemoveEmptyEntries
        const pair = propertyStr.split('=').filter((item) => { return item; });

        if (pair.length >= 2) {
          const [key, ...value] = pair;
          command.properties[key] = this.UnescapeProperty(value.join('='));
        }
      }
    }

    const data = message.substring(endIndex + this.CommandKey.length);
    command.data = this.UnescapeData(data);
    return command;
  }
}

export default ActionCommand;
