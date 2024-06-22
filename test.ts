/* eslint-disable max-classes-per-file */
// 定义一个基类 Shape
class Shape {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  // 静态方法，根据 type 返回不同的 Shape 子类实例
  static getInstance(type: string): Shape {
    switch (type) {
      case 'Circle':
        return new Circle('Circle');
      case 'Square':
        return new Square('Square');
      case 'Rectangle':
        return new Rectangle('Rectangle');
      default:
        throw new Error(`Unknown shape type: ${type}`);
    }
  }
}

// 定义 Circle 类，继承自 Shape
class Circle extends Shape {
  constructor(name?: string) {
    super(name);
  }

  draw() {
    console.log('Drawing a circle.');
  }
}

// 定义 Square 类，继承自 Shape
class Square extends Shape {
  constructor(name?: string) {
    super(name);
  }

  draw() {
    console.log('Drawing a square.');
  }
}

// 定义 Rectangle 类，继承自 Shape
class Rectangle extends Shape {
  constructor(name?: string) {
    super(name);
  }

  draw() {
    console.log('Drawing a rectangle.');
  }
}

// 使用 Shape 类的静态方法获取实例
const shapeType = 'Circle'; // 假设这个值可以是 'Circle', 'Square', 或 'Rectangle'
const shapeInstance = Shape.getInstance(shapeType);
console.log('shapeInstance', shapeInstance);
// 调用实例的方法
shapeInstance.draw(); // 输出: Drawing a circle.
