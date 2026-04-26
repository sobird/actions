/* eslint-disable @typescript-eslint/no-loop-func */
import ActionCommand from '.';

describe('ActionCommand.Parser Test', () => {
  const commands = new Set(['do-something', 'set-env']);
  const arrange: any = [
    {
      message: '::do-something k1=v1,::msg',
      commands,
      command: 'do-something',
      properties: {
        k1: 'v1',
      },
      data: 'msg',
    },

    {
      message: '::do-something::',
      commands,
      command: 'do-something',
    },

    {
      message: '::do-something k1=;=%2C=%0D=%0A=]=%3A,::;-%0D-%0A-]-:-,',
      commands,
      command: 'do-something',
      properties: {
        k1: ';=,=\r=\n=]=:',
      },
      data: ';-\r-\n-]-:-,',
    },
    {
      message: '::do-something k1=;=%252C=%250D=%250A=]=%253A,::;-%250D-%250A-]-:-,',
      commands,
      command: 'do-something',
      properties: {
        k1: ';=%2C=%0D=%0A=]=%3A',
      },
      data: ';-%0D-%0A-]-:-,',
    },
    {
      message: '::do-something k1=,k2=,::',
      commands,
      command: 'do-something',
    },
    {
      message: '::do-something k1=v1::',
      command: 'do-something',
      commands,
      properties: {
        k1: 'v1',
      },
    },

    {
      message: '   ::do-something k1=v1,::msg',
      command: 'do-something',
      commands,
      properties: {
        k1: 'v1',
      },
      data: 'msg',
    },

    {
      message: '   >>>   ::do-something k1=v1,::msg',
      commands,
    },
    {
      message: '::set-env name=name,::sobird',
      commands,
      command: 'set-env',
      properties: {
        name: 'name',
      },
      data: 'sobird',
    },
  ];

  for (const item of arrange) {
    it(item.message, () => {
      let test = null;
      if (item.command) {
        test = new ActionCommand(item.command, item.properties, item.data);
      }

      const actionCommand = ActionCommand.Parse(item.message, item.commands);

      expect(actionCommand).toEqual(test);
      expect(ActionCommand.Parse(actionCommand?.toString(), item.commands)).toEqual(actionCommand);
    });
  }
});
