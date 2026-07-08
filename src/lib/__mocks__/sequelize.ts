import { sequelize, BaseModel } from '../sequelize';

(sequelize as any).options.storage = ':memory:';

export { sequelize, BaseModel };
