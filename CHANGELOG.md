# Changelog

## 1.0.0 (2025-03-06)


### Features

* add-matcher action command & runner addMatchers ([34f9c83](https://github.com/sobird/actions/commit/34f9c83faeec77cc761e3ae21e87809278853642))
* runner container stdout & stderr use output manager ([1adce79](https://github.com/sobird/actions/commit/1adce798169633af7e57d42b5f11d00fade3b63d))
* support docker container create options ([6847bcc](https://github.com/sobird/actions/commit/6847bcce2a95453e704072c6f44d80d9e06eba4a))
* support job outputs ([df7f45e](https://github.com/sobird/actions/commit/df7f45ed319da4e6d4d35cc3aefa133238b9a884))
* support matrix outputs ([a29ed62](https://github.com/sobird/actions/commit/a29ed627c551fe25ffc095bdf1fa51c588ecf6c3))
* support workflow_call outputs & inputs & secrets ([5517c47](https://github.com/sobird/actions/commit/5517c47a37f8388975da0c02d5b075a76ff5801e))
* workflow_dispatch inputs prompts ([86edd8d](https://github.com/sobird/actions/commit/86edd8d9fedde2ee7fddf213546067f18f51a3db))


### Bug Fixes

* all attributes of context need to be cloned ([4a16cb3](https://github.com/sobird/actions/commit/4a16cb369e3f3251f7d8042cd9eca08a706631ce))
* apply state use STATE_ suffix ([22a8476](https://github.com/sobird/actions/commit/22a84769cbbd516aba4ce461d6cd6d3c8a255751))
* applyPath ([69fe4fc](https://github.com/sobird/actions/commit/69fe4fcf5e262f5b47912f294c12ff496fff7178))
* artifact cache findCache decodeURI ([420b484](https://github.com/sobird/actions/commit/420b484963d10f512b51c39b2e671aaff778c406))
* artifact server ListArtifacts ([25882b3](https://github.com/sobird/actions/commit/25882b36fc0019d95416379fa268e33a5e95ea61))
* container hashFiles function error ([e88e1e1](https://github.com/sobird/actions/commit/e88e1e142c21edbd77b13d69c52bbfbef65d3199))
* container name generate ([2b111be](https://github.com/sobird/actions/commit/2b111be29bed2e4cb6e792ce40264e7132be2ff0))
* docker action entrypoint params ([85565e7](https://github.com/sobird/actions/commit/85565e7e96be38b5572f1f9ec4de2ce302a1ba42))
* docker container ACTIONS_CACHE_URL use host.docker.internal hostname ([096cb3f](https://github.com/sobird/actions/commit/096cb3f9a06b3ed6134c9f3f6d1fd35497be8b9e))
* docker container create workdir need resolve ([3973aa8](https://github.com/sobird/actions/commit/3973aa8b1297cd7b73957aa3e6b799f49f1d15bc))
* docker container resolve ([73ad73c](https://github.com/sobird/actions/commit/73ad73c4c11bd46dea30ea9eaa6dec199ba2128a))
* docker hub default setting with environment to container & shell-quote parse perf ([7e0ca23](https://github.com/sobird/actions/commit/7e0ca238fc3f4c5d2a186f1058601b7db6de6d23))
* docker hub with entrypoint is diff docker action main entrypoint ([68c5d2e](https://github.com/sobird/actions/commit/68c5d2ec9818cb4cf2536b211c2e9e439ba339de))
* file command container get file env fun no correct result ([bf9a4bb](https://github.com/sobird/actions/commit/bf9a4bb36f8f62e9090882e5e53b6c29dda9ee31))
* hosted container exec & spawnSync remove NODE_OPTIONS env for development mode ([ee5c39b](https://github.com/sobird/actions/commit/ee5c39b8cf471ff75196671ecf9c295a80922026))
* hosted put method filter ignore ([227b4a0](https://github.com/sobird/actions/commit/227b4a0f0b3a9f94f14a28434f6b8e07ce68ba32))
* introducing intermediate modules(Run): Breaking circular dependencies ([af32469](https://github.com/sobird/actions/commit/af32469581df55c57b7528bd30b8a8c54be572bc))
* mac hosted when run bindwork save cache throw error No such file or directory ([74c5e8a](https://github.com/sobird/actions/commit/74c5e8a172e236218f96160e7b3e1131452fdadb))
* move @actions/glob to pkg hashfiles ([145ef9d](https://github.com/sobird/actions/commit/145ef9dcfc9c47000b0f04a1c92b9eed81653775))
* nodejs action pre executor use HasPre if ([b2a46f6](https://github.com/sobird/actions/commit/b2a46f691c5fd03ada53d0a22465110cf55dfdc1))
* pkg hashFiles tsconfig set skipLibCheck: true ([640a94f](https://github.com/sobird/actions/commit/640a94f3378195ce04a5fd0fc048b14cd37f6a85))
* pnpm log4js Module not found ([2ac5df9](https://github.com/sobird/actions/commit/2ac5df91aa8c1a4c888d238c8f9deae19f616e41))
* pnpm run cmd error: ELIFECYCLE  Command failed with exit code 1 ([4b0b654](https://github.com/sobird/actions/commit/4b0b65464710a277876b9f1ed4d13ede1d1f1296))
* pre execution is not supported for local action ([4f61120](https://github.com/sobird/actions/commit/4f61120ce22297c26b9d88dc85afcbc5e98cf147))
* reusable workflow detected cyclic reference ([30ad795](https://github.com/sobird/actions/commit/30ad795ebc761e702972c931142a037b7992b3b3))
* reusable workflow should be run before container startup ([8ea9f6e](https://github.com/sobird/actions/commit/8ea9f6e6f01a1b96630724a243fe42177361d732))
* run daemon use runner config ([41b626f](https://github.com/sobird/actions/commit/41b626f87916c241da0f72ec9036360f02f2713b))
* runner.context.github.action_path ([04b0ba3](https://github.com/sobird/actions/commit/04b0ba37f39f31a4ff6dcb073f0e18df852ad23a))
* services --mount ([0040269](https://github.com/sobird/actions/commit/0040269fd4f8bca4dc4cc0bb3bba17cba250a8d8))
* services start endpoint ([842a409](https://github.com/sobird/actions/commit/842a409529def59808bd4984fe0015321b395b10))
* update build:actions ([c739cd6](https://github.com/sobird/actions/commit/c739cd61cbb4e46d6440e05fdefd8054ac4e3483))
* use composite with error & properly handle job status ([56e34f4](https://github.com/sobird/actions/commit/56e34f46b8172259b183aac647dbe8761c464b7a))
* windows Resolve nodejs action path error ([ce783b9](https://github.com/sobird/actions/commit/ce783b9c4d014674bd7abb5d45aea038573b518f))
* windows workdir error ([01f13e3](https://github.com/sobird/actions/commit/01f13e364f1728332fc4a937cc9df4176102eb6a))


### Performance Improvements

* action use import() dynamic import subclass ([fd74666](https://github.com/sobird/actions/commit/fd74666f1ef5d69566fdacacb91715e13157241f))
* add stdout and stderr parameters to container options ([1c3ff63](https://github.com/sobird/actions/commit/1c3ff6395535ae17942f1b06848626b01ec2474d))
* job strategy get matrices & run.job ([b68e32b](https://github.com/sobird/actions/commit/b68e32b074c84c989fc7814390d2181907b8d75a))
* replace --volume with --mount ([efd59c9](https://github.com/sobird/actions/commit/efd59c93a5a5551cf0afa517edcfbe7c546c4d5e))
* replace better-sqlite3 with sqlite3 ([5fd9112](https://github.com/sobird/actions/commit/5fd9112a2054fc8d95ac4106dbf92d4cc826e638))
* step action factory ready to remove ([ef4e62e](https://github.com/sobird/actions/commit/ef4e62e2ff6f7ccd4a5e74979ee69d98c0644630))
