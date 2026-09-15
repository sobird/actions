import { sequelize, BaseModel, getNextResourceIndex } from '../sequelize';

(sequelize as any).options.storage = ':memory:';

export { sequelize, BaseModel, getNextResourceIndex };
