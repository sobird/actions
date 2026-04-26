import type { CommandExtension } from '.';

const EchoCommandExtension: CommandExtension = {
  command: 'echo',
  echo: true,
  process(runner, command) {
    switch (command.data.trim().toUpperCase()) {
      case 'ON':
        runner.echoOnActionCommand = true;
        // runner.debug("Setting echo command value to 'on'");
        break;
      case 'OFF':
        runner.echoOnActionCommand = false;
        // runner.debug("Setting echo command value to 'off'");
        break;
      default:
        throw new Error(`Invalid echo command value. Possible values can be: 'on', 'off'. Current value is: '${command.data}'.`);
    }
  },
};

export default EchoCommandExtension;
