import { sequelize } from '../sequelize';

export { BaseModel } from '../sequelize';

(sequelize as any).options.storage = ':memory:';

export {
  sequelize,
};
