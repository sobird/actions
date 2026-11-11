import { DbfsData } from './data';
import { DbfsMeta } from './meta';

export * from './file';

export * from './data';
export * from './meta';

// A file's bytes are split into blocks; wire the two halves together here so neither
// module has to import the other at runtime. `constraints: false` matches gitea, whose
// xorm models declare no foreign keys, and keeps a data-only sync from needing the
// meta table up front.
DbfsMeta.hasMany(DbfsData, { as: 'chunks', foreignKey: 'metaId', constraints: false });
DbfsData.belongsTo(DbfsMeta, { as: 'meta', foreignKey: 'metaId', constraints: false });
