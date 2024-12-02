import {
  Sequelize, Op, Model, DataTypes,
} from 'sequelize';

const sequelize = new Sequelize('sqlite::memory:');

const User = sequelize.define('user', {
  username: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  hashedPassword: {
    type: DataTypes.STRING(64),
    validate: {
      is: /^[0-9a-f]{64}$/i,
    },
  },
});

(async () => {
  await sequelize.sync({ force: true });
  // Code here
  await User.create({
    username: 'sobird',
    hashedPassword: '**',
  });
})();
