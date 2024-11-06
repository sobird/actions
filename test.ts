// 传入一个类型，得到这个类型的所有可选(必选)字段
interface Options {
  option1: string;
  options2?: number;
  options3?: boolean;
}

// let a: Required<Options>;

type GetOptional<T> = {
  [K in keyof T as T[K] extends Required<T>[K] ? never : K]: T[K];
};

const keys: GetOptional<Options> = {
  options2: 123,
};

console.log('keys', keys);
