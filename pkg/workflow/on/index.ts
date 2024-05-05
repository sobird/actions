class On {
  private on: any;

  constructor(on: unknown) {
    if (typeof on === 'string') {
      //
    }

    this.on = on;
  }

  /**
   * 在推送提交或标记或使用模板创建存储库时运行工作流。
   *
   * @example
   * on:
   *   push
   */
  get push() {
    const { push } = this.on;
    console.log('push', push);
  }

  toJSON() {
    return {
      push: this.push,
    };
  }
}

export default On;
