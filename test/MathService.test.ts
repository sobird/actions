// MathService.test.ts
import { MathService } from './MathService';

vi.mock('./MathService');

console.log('MathService', new MathService());

// 使用 jest.fn 创建一个模拟函数
const mockSum = vi.fn();

// 创建一个模拟的 MathService 类
class MockMathService extends MathService {
  // eslint-disable-next-line class-methods-use-this
  sum(a: number, b: number): number {
    return mockSum(a, b);
  }
}

describe('MathService', () => {
  it('should use the mocked sum method', () => {
    // 使用 mock 实例化 MockMathService
    const mathService = new MockMathService();

    // 模拟 sum 方法的行为
    mockSum.mockReturnValueOnce(5);

    // 执行测试
    const result = mathService.sum(2, 3);

    // 断言 sum 方法被调用，并且返回了预期的值
    expect(mockSum).toHaveBeenCalledWith(2, 3);
    expect(result).toBe(5);
  });
});
