import { DbfsMeta, DbfsMetaCreationAttributes } from '../meta';

const seeds: DbfsMetaCreationAttributes[] = [];

await DbfsMeta.sync({ force: true });
await DbfsMeta.bulkCreate(seeds, { individualHooks: true, validate: true });

export * from '../meta';
