enum MyEnum {
  A,
  B = 'b',
  C = 'c',
}

console.log('MyEnum', MyEnum);
// 获取枚举的键列表
const enumKeys = Object.keys(MyEnum).filter((key) => { return Number.isNaN(Number(key)); });
console.log(enumKeys); // 输出: ["A", "B", "C"]
