import { Command, Option } from 'commander';

const program = new Command();

program
  .option('--no-optionA', 'Option A')
  .option('--optionB', 'Option B')
  .option('--optionC', 'Option C')
  .addOption(new Option('--optionD').conflicts('optionA'))
  .action(async (opts, program) => {
    console.log('opts', opts);
  });

program.parse(process.argv);
