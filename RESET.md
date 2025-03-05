About
Impl Github Actions & Runner using typescript

Topics
devops typescript ci-cd github-runner github-actions typescript-actions

Repository secrets

MY_RELEASE_PLEASE_TOKEN
NPM_TOKEN

Issues

使用connectrpc进行protobuf开发

actions runner 通过 [connectrpc](https://github.com/connectrpc) 来跟服务实例进行通信。

借助 connectrpc 官方提供的 [@connectrpc/protoc-gen-connect-es](https://www.npmjs.com/package/@connectrpc/protoc-gen-connect-es) 来生成与浏览器和 Node.js 兼容的客户端和服务端定义代码。

下面是该工具的简单使用:

**安装 buf 工具**
```sh
npm install --save-dev @bufbuild/buf @bufbuild/protoc-gen-es @connectrpc/protoc-gen-connect-es
npm install @connectrpc/connect @bufbuild/protobuf
```

**使用 buf 生成代码**

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
* **ts_nocheck**: 控制是否在每个文件顶部生成 // @ts-nocheck 注释。

--bind-workdir 和 --no-skip-checkout 参数互斥，不可同时设为true

- 参数`--bind-workdir`设为`true`，意味着将本地实际actions运行的仓库目录bind到容器工作目录下，
- 参数`--no-skip-checkout`设置`true`，不要跳过checkout，意味着使用`actions/checkout`从远程仓库下载到容器中bind的工作目录

`actions/checkout`下载之前会清空工作目录的文件，所以这种情况下会导致本地仓库的文件丢失，禁止同时设置这两个参数值为`true`。

* Error: Could not locate the bindings file. Tried: #9

Error: Could not locate the bindings file. Tried:
 → \node_modules\.pnpm\better-sqlite3@11.8.1\node_modules\better-sqlite3\build\better_sqlite3.node

运行下面命令解决
```sh
cd node_modules/better-sqlite3
npm run build-release
cd ../..
```
[issues 886](https://github.com/WiseLibs/better-sqlite3/issues/866)

actions/cache hosted when run bindwork save cache throw error Cannot stat: No such file or directory #8

If you are using a `self-hosted` Windows runner, `GNU tar` and `zstd` are required for Cross-OS caching to work. They are also recommended to be installed in general so the performance is on par with `hosted` Windows runners.

类似下面目录为 actions/cache 创建的临时目录
`/Users/sobird/.actions/actions/c88dd2466a5b7752/home/runner/work/temp/7a3d7800-55cb-4962-bc11-684f0fccefb4`

执行下面tar打包命名， 其中manifest.txt的内容为: `../../../../c88dd2466a5b7752/Users/sobird/actions/test`
```sh
/usr/bin/tar --posix -cf cache.tzst --exclude cache.tzst -P -C /Users/sobird/.actions/actions/c88dd2466a5b7752/Users/sobird/actions --files-from manifest.txt --use-compress-program zstdmt
```
则会报下面的错误
```sh
tar: ../../../../c88dd2466a5b7752/Users/sobird/actions/test: Cannot stat: No such file or directory
```

而将manifest.txt内容改为 `../../../Users/sobird/actions/test`，则不会再报错，什么原因？

---

在 Node.js 中，`process.cwd()` 获取的是当前进程的实际工作目录，而不是软链接的路径。这意味着，如果当前工作目录是通过软链接进入的，`process.cwd()` 会返回实际的物理路径，而不是软链接的路径。

见：[internal-pattern](https://github.com/actions/toolkit/blob/main/packages/glob/src/internal-pattern.ts#L261)

```sh
/usr/bin/tar --posix -cf cache.tzst --exclude cache.tzst -P -C /Users/sobird/.actions/actions/c88dd2466a5b7752/Users/sobird/actions
```
上面命令中 -C后面的参数，如果是软连接的目录，则实际执行时会转为物理路径`/Users/sobird/actions`，而此时manifest.txt的内容为: `../../../../c88dd2466a5b7752/Users/sobird/actions/test`，导致出现下面的错误：
```sh
tar: ../../../../c88dd2466a5b7752/Users/sobird/actions/test: Cannot stat: No such file or directory
````

当以`hosted`和`bindwork`模式运行时，设置`context.github.workspace`为容器物理地址，不要使用软连接的地址

见此[commit](https://github.com/sobird/actions/commit/b8d7440f5b2869ad1c4ea6ba6461122d28af65f6#diff-23b707279c18febbfef7ef9a041ac9e35f0ead2cabd643f4befb86a21eefd127)


在macOS下使用 gnu-tar，执行下面命令安装
```sh
brew install gnu-tar
```
详细见：[cache tar.ts](https://github.com/actions/toolkit/blob/main/packages/cache/src/internal/tar.ts#L31)