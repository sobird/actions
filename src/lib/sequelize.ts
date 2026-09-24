/**
 * Sequelize Instance
 *
 * Sequelize is an easy-to-use and promise-based Node.js ORM tool for
 * Postgres, MySQL, MariaDB, SQLite, DB2 and Microsoft SQL Server.
 * It features solid transaction support, relations, eager and lazy loading, read replication and more.
 *
 * @see https://javascript.plainenglish.io/why-you-should-be-cautious-with-sequelize-raw-options-5aaae9fc3ebd
 *
 * sobird<i@sobird.me> at 2021/11/16 20:33:20 created.
 */

import {
  Sequelize,
  Model,
  QueryTypes,
  type ModelStatic,
  type InferAttributes,
  type FindAndCountOptions,
  type Transaction,
} from 'sequelize';
import sqlite3 from 'sqlite3';

import logger from '@/common/logger';

interface FindManyByPageOptions extends Omit<FindAndCountOptions, 'offset' | 'limit'> {
  page?: number;
  /** 每页条数 */
  limit?: number;
}

/** 数据库链接实例 */
export const sequelize = new Sequelize({
  // The name of the database
  // database: 'mix',

  // The username which is used to authenticate against the database.
  // username: 'root',

  // The password which is used to authenticate against the database.
  // password: '12345678',

  // the sql dialect of the database
  // currently supported: 'mysql', 'sqlite', 'postgres', 'mssql'
  dialect: 'sqlite',

  dialectModule: sqlite3,

  // custom host; default: localhost
  host: '127.0.0.1',
  // for postgres, you can also specify an absolute path to a directory
  // containing a UNIX socket to connect over
  // host: '/sockets/psql_sockets'.

  // custom port; default: dialect default
  // port: 3306,

  // custom protocol; default: 'tcp'
  // postgres only, useful for Heroku
  // protocol: null,

  // disable logging or provide a custom logging function; default: console.log
  // logging: false,

  // you can also pass any dialect options to the underlying dialect library
  // - default is empty
  // - currently supported: 'mysql', 'postgres', 'mssql'
  dialectOptions: {
    // 指定套接字文件路径
    // socketPath: '/var/lib/mysql/mysql.sock',
    supportBigNumbers: true,
    bigNumberStrings: true,
    // if your server run on full cpu load, please set trace to false
    trace: true,
  },

  // the storage engine for sqlite
  // - default ':memory:'
  storage: './database.sqlite',

  // disable inserting undefined values as NULL
  // - default: false
  omitNull: true,

  // a flag for using a native library or not.
  // in the case of 'pg' -- set this to true will allow SSL support
  // - default: false
  native: true,

  // Specify options, which are used when sequelize.define is called.
  // The following example:
  //   define: { timestamps: false }
  // is basically the same as:
  //   Model.init(attributes, { timestamps: false });
  //   sequelize.define(name, attributes, { timestamps: false });
  // so defining the timestamps for each model will be not necessary
  define: {
    underscored: true,
    // 强制表名称等于模型名称
    // freezeTableName: true,
    charset: 'utf8',
    // dialectOptions: {
    //   collate: 'utf8_general_ci'
    // },
    timestamps: true,

    // createdAt: 'createdAt',
    // updatedAt: 'updatedAt',
    // noPrimaryKey: true,
  },

  // similar for sync: you can define this to always force sync for models
  // sync: { force: true },

  // pool configuration used to pool database connections
  pool: {
    max: 5,
    idle: 30000,
    acquire: 60000,
  },

  // isolation level of each transaction
  // defaults to dialect default
  // isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ
  logging: (sql, queryObject: any) => {
    const { type, bind } = queryObject;
    logger.debug(`${type}: ${sql}`);
    if (['INSERT', 'UPDATE', 'BULKUPDATE'].includes(type)) {
      logger.debug(bind);
    }
  },
});

// sequelize.addHook('beforeDefine', (attributes) => {
//   // todo
//   console.log('attributes', attributes);
// });

/**
 * 模型基类
 *
 * sobird<i@sobird.me> at 2023/12/05 21:08:43 created.
 */
export class BaseModel<T extends {} = any, P extends {} = T> extends Model<T, P> {
  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  declare static associate: (models: never) => void;

  /** 分页查找模型数据 */
  public static async findManyByPage<M extends BaseModel>(
    this: ModelStatic<M>,
    options: FindManyByPageOptions,
  ): Promise<{
    page: number;
    limit: number;
    count: number;
    rows: InferAttributes<M>[];
  }> {
    const { page = 1, limit = 20, ...restOptions } = options;
    const offset = (page - 1) * limit;

    try {
      const { count, rows } = await this.findAndCountAll({
        offset,
        limit,
        ...restOptions,
      });
      return {
        page,
        limit,
        count,
        rows: rows.map((el) => {
          return el.toJSON();
        }),
      };
    } catch {
      // console.log('err', err);
    }

    return {
      page,
      limit,
      count: 0,
      rows: [],
    };
  }
}

/**
 * Allocate the next index for `groupId` and return it. The first allocation is 1.
 *
 * The counter is kept in a dedicated table rather than derived from a "max() + 1"
 * read, which two concurrent callers could resolve to the same value and collide
 * on the unique index. Port of gitea's `models/db/index.go` `GetNextResourceIndex`.
 *
 * The table and column names come from the model's own metadata, so the
 * interpolation below can never be steered by caller input.
 */
export async function getNextResourceIndex<M extends BaseModel>(
  model: ModelStatic<M>,
  groupId: number,
  transaction: Transaction,
): Promise<number> {
  const table = model.getTableName() as string;
  const attributes = model.getAttributes();
  const groupColumn = attributes.groupId.field ?? 'groupId';
  const indexColumn = attributes.maxIndex.field ?? 'maxIndex';

  // sqlite3 does not reliably report the rows a raw UPDATE touched, so upstream's
  // UPDATE-else-INSERT-then-UPDATE retry cannot be transcribed. An upsert does the
  // same job in one statement, and the read that follows sees this transaction's
  // own write.
  await sequelize.query(
    `INSERT INTO ${table} (${groupColumn}, ${indexColumn}) VALUES (?, 1)
     ON CONFLICT (${groupColumn}) DO UPDATE SET ${indexColumn} = ${indexColumn} + 1`,
    { replacements: [groupId], transaction },
  );

  const [row] = await sequelize.query<{ maxIndex: number }>(
    `SELECT ${indexColumn} AS maxIndex FROM ${table} WHERE ${groupColumn} = ?`,
    { replacements: [groupId], type: QueryTypes.SELECT, transaction },
  );

  return Number(row.maxIndex);
}
