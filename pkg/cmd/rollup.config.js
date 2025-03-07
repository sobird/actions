/**
 * rollup.config.js
 * 打包压缩ts文件
 *
 * @type {import('rollup').RollupOptions}
 * @see https://cn.rollupjs.org/configuration-options
 * sobird<i@sobird.me> at 2023/09/28 11:30:37 created.
 */

import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import { defineConfig } from 'rollup';
import clear from 'rollup-plugin-clear';
import copy from 'rollup-plugin-copy';
import nodeExternals from 'rollup-plugin-node-externals';
import typescript from 'rollup-plugin-typescript2';

const isProduction = process.env.NODE_ENV === 'production';
const DIST = isProduction ? 'dist' : 'dist';

export default (env) => {
  return defineConfig([
    // { // es module
    //   input: mainInput,
    //   output: {
    //     //preserveModules: true,
    //     dir: `${DIST}/es`,
    //     format: "es",
    //   },
    //   plugins: plugins({
    //     clear: {
    //       targets: [`${DIST}/es`],
    //     },
    //   }, env),
    // },

    { // es module
      input: 'index.ts',
      output: {
        dir: `${DIST}`,
        format: 'es',
        // entryFileNames: '[name].cjs',
        // exports: 'named',
        // footer: ({exports}) => exports.length > 0 ? 'module.exports = Object.assign(exports.default || {}, exports)' : '',
      },
      plugins: [
        clear({
          targets: [DIST],
          watch: false,
        }),
        replace({
          delimiters: ['', ''],
          values: {
            '#!/usr/bin/env tsx': '#!/usr/bin/env node',
            // '"actions": "./index.ts"': '"actions": "./dist/index.js"',
          },
          preventAssignment: true,
        }),
        nodeExternals({
          // builtins: true, // 自动处理 Node.js 内置模块
          deps: true, // 自动处理 dependencies
          peerDeps: true, // 自动处理 peerDependencies
          // devDeps: true,
        }),
        nodeResolve({
          preferBuiltins: true,
        }),
        commonjs(),
        typescript({
          check: false,
          // declaration: true,
          // tsconfig: "./src/tsconfig.json",
          // noEmitOnError: false,
          strictRequires: true,
        }),
        json(),
        terser(),
        copy({
          targets: [
            { src: '../config/default.yaml', dest: DIST },
            { src: '../runner/container/hashFiles/index.js', dest: `${DIST}/hashFiles` },
            { src: '../../README.md', dest: '.' },
          ],
          copyOnce: env.watch,
        }),
      ],
      // external: [...Object.keys(pkg.dependencies), ...Object.keys(pkg2.dependencies)],
    },
  ]);
};
