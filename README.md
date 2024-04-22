# npm-template
npm包模板仓库，该模板仓库演示了一个可以通过`node`运行一个带有`tsconfig-paths`配置的 `TypeScript` 脚本。

[![npm][npm]][npm-url]
[![Build Status][build-status]][build-status-url]
[![Install Size][size]][size-url]

<!-- Badges -->

[npm]: https://img.shields.io/npm/v/@sobird/npm-template.svg
[npm-url]: https://www.npmjs.com/package/@sobird/npm-template
[build-status]: https://img.shields.io/github/actions/workflow/status/sobird/npm-template/release-please.yml?label=CI&logo=github
[build-status-url]: https://github.com/sobird/npm-template/actions
[size]: https://packagephobia.com/badge?p=@sobird/npm-template
[size-url]: https://packagephobia.com/result?p=@sobird/npm-template



## ts-node with tsconfig-paths

安装完本包后(建议安装到全局)，配置环境变量

```sh
npm i -g @sobird/npm-template
# 该路径为@sobird/npm-template实际安装路径
export NODE_OPTIONS="--import=/path/to/register.js"
```

如上配置完成后，即可通过`node`执行运行`TypeScript`文件，比如：

```ts
import fs from 'fs';
// tsconfig-paths
import utils from '@/utils/local'

console.log(fs, utils);
```

## How to publish

### 方式一

手动通过下面的命令，进行tag发布

```sh
yarn version --patch
yarn version --minor
yarn version --major
```

### 方式二

通过 `release-please` 这个自动化Action进行发布，详见 `.github/workflows/release-please.yml` 配置

## 参考

* [约定式提交](https://www.conventionalcommits.org/zh-hans/v1.0.0/)