import { DbfsData, DbfsDataCreationAttributes } from '../data';

const seeds: DbfsDataCreationAttributes[] = [];

await DbfsData.sync({ force: true });
await DbfsData.bulkCreate(seeds, { individualHooks: true, validate: true });

export * from '../data';
