import { vi } from 'vitest';

// 每次 git 调用都带上一个固定提交身份，实现见 __mocks__/simple-git.ts。
// 放 setupFile 里是为了全测试只挂这一处，不用每个用例文件各写一遍。
vi.mock('simple-git');
