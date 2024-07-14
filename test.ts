class MyClass {
  private static instance: MyClass | null = null;

  private constructor() {
    // 构造函数逻辑
    console.log('123', 123);
  }

  public static getInstance(): MyClass {
    if (!MyClass.instance) {
      MyClass.instance = new MyClass();
    }
    return MyClass.instance;
  }
}

const instance = MyClass.getInstance();
console.log('instance', instance, new MyClass());

const Test: Function = () => {};

console.log('MyClass', MyClass);
