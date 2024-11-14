type DeepPartial<T> = Partial<{ [P in keyof T]: DeepPartial<T[P]> }>;
type GetOptional<T> = {
  [K in keyof T as T[K] extends Required<T>[K] ? never : K] : T[K];
};
