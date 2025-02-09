# Actions
Impl Actions runner using typescript

[![npm][npm]][npm-url]
[![Build Status][build-status]][build-status-url]
[![Install Size][size]][size-url]

## install

```sh
npm i -g @sobird/actions
```

## 开发

### connectrpc

actions runner 通过 [connectrpc](https://github.com/connectrpc) 来跟gitea服务实例进行通信。

借助 connectrpc 官方提供的 [@connectrpc/protoc-gen-connect-es](https://www.npmjs.com/package/@connectrpc/protoc-gen-connect-es) 来生成与浏览器和 Node.js 兼容的客户端和服务端定义代码。

下面是该工具的简单使用:

#### 安装 buf 工具
```sh
npm install --save-dev @bufbuild/buf @bufbuild/protoc-gen-es @connectrpc/protoc-gen-connect-es
npm install @connectrpc/connect @bufbuild/protobuf
```

#### 使用 buf 生成代码

创建配置文件 `buf.gen.yaml`:

```yml
# buf.gen.yaml defines a local generation template.
# For details, see https://docs.buf.build/configuration/v1/buf-gen-yaml
version: v1
plugins:
  # This will invoke protoc-gen-es and write output to src/gen
  - plugin: es
    out: src/gen
    opt: target=ts
  # This will invoke protoc-gen-connect-es
  - plugin: connect-es
    out: src/gen
    opt:
      # Add more plugin options here
      - target=ts
```
项目中的所有protobuf文件生成代码：

```sh
npx buf generate
```

或者，生成远程git仓库中所有protobuf文件到本地

```sh
npx buf generate https://gitea.com/sobird/actions-proto-def.git
```

### 插件选项
* **target**: 控制插件生成 JavaScript、TypeScript 或 TypeScript 声明文件。可能的值有 js、ts 和 dts。
* **import_extension**: 允许在导入路径中替换 .js 扩展名。
* **js_import_style**: 生成 ECMAScript 导入/导出语句或 CommonJS require() 调用。
* **keep_empty_files**: 允许保留空文件，以兼容需要提前声明所有输出文件的工具，如 Bazel。
* **ts_nocheck**: 控制是否在每个文件顶部生成 // @ts-nocheck 注释。*

## 创建配置文件

```sh
actions config > actions.config.yaml
```

## Emoji

* 火焰 🔥 `\u{1F525}`
* 喷水的鲸 🐳 `\u{1F433}`

## Webhooks


## Yarn Workspaces

```sh
# 显示当前项目的工作空间依赖树
yarn workspaces info

# 运行选定的工作空间（即包）的yarn命令，示例：yarn workspace awesome-package add react --dev
yarn workspace <package-name> <command>


# 为所有的包添加一个共同的依赖关系，进入项目的根目录并使用-W (或-ignore-workspace-root-check) 标志
yarn add some-package -W
```

## actions/cache

```
If you are using a `self-hosted` Windows runner, `GNU tar` and `zstd` are required for Cross-OS caching to work. They are also recommended to be installed in general so the performance is on par with `hosted` Windows runners.
```

```sh
# 类似下面目录为 actions/cache 创建的临时目录
/Users/sobird/.actions/actions/c88dd2466a5b7752/home/runner/work/temp/7a3d7800-55cb-4962-bc11-684f0fccefb4

# 执行下面tar打包命名， 其中manifest.txt的内容为: `../../../../c88dd2466a5b7752/Users/sobird/actions/test`
/usr/bin/tar --posix -cf cache.tzst --exclude cache.tzst -P -C /Users/sobird/.actions/actions/c88dd2466a5b7752/Users/sobird/actions --files-from manifest.txt --use-compress-program zstdmt

# 则会报下面的错误
tar: ../../../../c88dd2466a5b7752/Users/sobird/actions/test: Cannot stat: No such file or directory

# 而将manifest.txt内容改为 ../../../Users/sobird/actions/test，则不会再报错，什么原因？

```

在 Node.js 中，`process.cwd()` 获取的是当前进程的实际工作目录，而不是软链接的路径。这意味着，如果当前工作目录是通过软链接进入的，`process.cwd()` 仍然会返回实际的物理路径，而不是软链接的路径。

见：[internal-pattern](https://github.com/actions/toolkit/blob/main/packages/glob/src/internal-pattern.ts#L261)

因为 `process.cwd()` 获取的是实际物理路径，导致在上面使用tar命令打包时，会出现 `../../../../c88dd2466a5b7752/Users/sobird/actions/test` 类似这样的相对路径，导致打包失败，如何解决呢？

执行上面的tar命令，在mac系统下会出现下面所示错误，但在Linux平台不会出错，为什么？
```
tar: ../../../../../../actions/test: Cannot stat: No such file or directory
tar: Error exit delayed from previous errors.
```

在macOS下使用 gnu-tar，执行下面命令安装
```sh
brew install gnu-tar
```
详细见：[cache tar.ts](https://github.com/actions/toolkit/blob/main/packages/cache/src/internal/tar.ts#L31)

<!-- Badges -->
[npm]: https://img.shields.io/npm/v/@sobird/actions.svg
[npm-url]: https://www.npmjs.com/package/@sobird/actions
[build-status]: https://img.shields.io/github/actions/workflow/status/sobird/actions/release-please.yml?label=CI&logo=github
[build-status-url]: https://github.com/sobird/actions/actions
[size]: https://packagephobia.com/badge?p=@sobird/actions
[size-url]: https://packagephobia.com/result?p=@sobird/actions