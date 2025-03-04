# Changelog

## [1.1.0](https://github.com/sobird/actions/compare/v1.0.1...v1.1.0) (2025-03-04)


### Features

* support docker container create options ([2242e66](https://github.com/sobird/actions/commit/2242e6656994109eeda55806ac58fc336a166b89))
* support job outputs ([077f8c1](https://github.com/sobird/actions/commit/077f8c12d616ee300916d968ac04d61421ff71ff))
* support matrix outputs ([071bf3a](https://github.com/sobird/actions/commit/071bf3af4a87d347fd52fe2dbab63597afc128d0))
* support workflow_call outputs & inputs & secrets ([e9558fa](https://github.com/sobird/actions/commit/e9558fabcb3a887eeee73bfc1976f15bf9f9d3c6))
* workflow_dispatch inputs prompts ([698035c](https://github.com/sobird/actions/commit/698035c2df95c20f56fa33d83ba2c006113920b3))


### Bug Fixes

* artifact server ListArtifacts ([21b69ed](https://github.com/sobird/actions/commit/21b69ed010934e980ed812e4ad134a71334904e1))
* container name generate ([d89c16a](https://github.com/sobird/actions/commit/d89c16a3769f307692c746ee8bf9b961a277a7bd))
* docker container create workdir need resolve ([ab116e0](https://github.com/sobird/actions/commit/ab116e034f78bd0d02f43f97eaf7301c99cf3e6a))
* docker hub default setting with environment to container & shell-quote parse perf ([d0fcc08](https://github.com/sobird/actions/commit/d0fcc08eb3ac5928edf1ca3fe381644c621d4626))
* docker hub with entrypoint is diff docker action main entrypoint ([69d1c22](https://github.com/sobird/actions/commit/69d1c22bcc62479545281ae6604b58217c1dd9a6))
* reusable workflow should be run before container startup ([e39d47b](https://github.com/sobird/actions/commit/e39d47b7c0748fca53825f28f17b1d181bd2e85e))
* services --mount ([3a5785a](https://github.com/sobird/actions/commit/3a5785ab6910676cb05a2d65be4b523c197355ea))
* windows Resolve nodejs action path error ([3345849](https://github.com/sobird/actions/commit/3345849a384d66afc351c3ff783fc3d4c39f6aac))
* windows workdir error ([3b29fdf](https://github.com/sobird/actions/commit/3b29fdfe2fc84ebaaa28bea40cb2d94178410230))
* windows workdir error ([e228595](https://github.com/sobird/actions/commit/e228595b80fad08e242ad1f48f423b00b51a6a47))


### Performance Improvements

* replace --volume with --mount ([20ce123](https://github.com/sobird/actions/commit/20ce1236688303529d01821fbf4ac54edde2e2e2))
* replace better-sqlite3 with sqlite3 ([9d795b0](https://github.com/sobird/actions/commit/9d795b0fb363e8f199dc589ae569b8fc775d8475))

## [1.0.1](https://github.com/sobird/actions/compare/v1.0.0...v1.0.1) (2025-02-26)


### Bug Fixes

* use composite with error & properly handle job status ([ed41d1f](https://github.com/sobird/actions/commit/ed41d1f082dd8665e02598d8a65cc96a84641c00))

## 1.0.0 (2025-02-25)


### Features

* add-matcher action command & runner addMatchers ([566a309](https://github.com/sobird/actions/commit/566a30971dbd3af34e3dbfb5339804842f435090))
* runner container stdout & stderr use output manager ([d36a381](https://github.com/sobird/actions/commit/d36a381d8aeecc78f59471532f7c3f22bc49a144))


### Bug Fixes

* .gitignore ([39973f0](https://github.com/sobird/actions/commit/39973f0717ee32267e6b06cc43a6c6d6fbabc2e4))
* all attributes of context need to be cloned ([c0ae072](https://github.com/sobird/actions/commit/c0ae072cff696dc2d8ed0b003cd36b03b3497242))
* apply state use STATE_ suffix ([5667dcb](https://github.com/sobird/actions/commit/5667dcb4eb956bd1e18f534f69a8eb74e85d2a6d))
* applyPath ([e61eb8a](https://github.com/sobird/actions/commit/e61eb8a1873879a2eabacc4592f0a7db08983078))
* artifact cache findCache decodeURI ([86baf6a](https://github.com/sobird/actions/commit/86baf6aad5a709425de1fd354ea85602c35cc1ab))
* container hashFiles function error ([0de837f](https://github.com/sobird/actions/commit/0de837fc940bb057d856027bc7e12bf70c3fc3c5))
* docker action entrypoint params ([e99d3b7](https://github.com/sobird/actions/commit/e99d3b754a09c7e75b134901e7cb95271e2b07c8))
* docker container ACTIONS_CACHE_URL use host.docker.internal hostname ([578574e](https://github.com/sobird/actions/commit/578574e6be92fb9d619d17c24cc1a09675d398c2))
* docker container resolve ([5831d63](https://github.com/sobird/actions/commit/5831d63098b4c0594fa2ddfc58402b9dc31fad11))
* file command container get file env fun no correct result ([451140c](https://github.com/sobird/actions/commit/451140c4fa2c17862a65c4bce7920830953d71d8))
* hosted container exec & spawnSync remove NODE_OPTIONS env for development mode ([0c1deda](https://github.com/sobird/actions/commit/0c1dedaebd1260b2a241cc623e44fc1f0424d4a4))
* hosted put method filter ignore ([892ff09](https://github.com/sobird/actions/commit/892ff0938786fb8972f183ebc7a7931b2b2ec373))
* introducing intermediate modules(Run): Breaking circular dependencies ([e709b8b](https://github.com/sobird/actions/commit/e709b8b7c0734533d18d9b5e4829219e351e255e))
* mac hosted when run bindwork save cache throw error No such file or directory ([b8d7440](https://github.com/sobird/actions/commit/b8d7440f5b2869ad1c4ea6ba6461122d28af65f6))
* move @actions/glob to pkg hashfiles ([8272c2b](https://github.com/sobird/actions/commit/8272c2b54a49e59cc20346ae1e1928c0e69572c6))
* nodejs action pre executor use HasPre if ([2636d3e](https://github.com/sobird/actions/commit/2636d3e2191d5b965d766d0a59f77eb677b284c8))
* pkg hashFiles tsconfig set skipLibCheck: true ([85429fe](https://github.com/sobird/actions/commit/85429fe472f4b02ce47acc64f0518f1eb7ffecfb))
* pnpm log4js Module not found ([f0ee9d2](https://github.com/sobird/actions/commit/f0ee9d2a7ba2c177eeded3d57d5ac112086d8c2b))
* pnpm run cmd error: ELIFECYCLE  Command failed with exit code 1 ([21d8e6c](https://github.com/sobird/actions/commit/21d8e6c8c7673b49f529daf2ad7b7bfd2006a48d))
* pre execution is not supported for local action ([2341d82](https://github.com/sobird/actions/commit/2341d82ac7de515af2d1d48f3d3ceed936f6255c))
* reusable workflow detected cyclic reference ([91da201](https://github.com/sobird/actions/commit/91da201d7befa480adc252a5a6601911ed2cfa05))
* run daemon use runner config ([3afad87](https://github.com/sobird/actions/commit/3afad877f5a275d9a42d4cf5b3857ffe0c6e3d47))
* runner.context.github.action_path ([e9c56db](https://github.com/sobird/actions/commit/e9c56db0131bc4764324e440088c6558479a1e09))
* services start endpoint ([e161be5](https://github.com/sobird/actions/commit/e161be5d33ba5be4a604d6bde2e30be4608ec1fd))
* unit test ([f233e4b](https://github.com/sobird/actions/commit/f233e4b04ab12a796920efac060e3aebfcf83736))


### Performance Improvements

* action use import() dynamic import subclass ([f8bae92](https://github.com/sobird/actions/commit/f8bae92e14bf54fdf5d683538bb906987d7b3b06))
* add stdout and stderr parameters to container options ([75fe0b9](https://github.com/sobird/actions/commit/75fe0b9e590cad6fe0f98001c96ffe6995b2009c))
* job strategy get matrices & run.job ([74fa8ba](https://github.com/sobird/actions/commit/74fa8bac83e4641daf2d62a5ab68c4a57196120f))
* step action factory ready to remove ([56b685c](https://github.com/sobird/actions/commit/56b685c5e6a893f877f1d6a6bfe12593f644e05d))

## Changelog
