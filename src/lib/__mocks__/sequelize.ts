import type { Options } from 'sequelize';

import { sequelize } from '../sequelize';

// 不能换成新实例：`getNextResourceIndex` 闭包了模块级的那一个 sequelize，换掉它模型和原生
// SQL 就会落到两个库。storage 只在建立连接时读，所以在这里改写仍然有效。
// 而 `options` 是运行时挂上去的，没进 Sequelize 的 .d.ts，只能把实例收窄到这一个属性。
const { options } = sequelize as unknown as { options: Options };
options.storage = ':memory:';

export * from '../sequelize';
