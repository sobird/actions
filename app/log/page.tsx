'use client';

import Editor, { loader, Monaco } from '@monaco-editor/react';
import { useRef } from 'react';

const monacoConfig = {
  paths: {
    vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs',
  },
};

loader.config(monacoConfig);

const logContent = `2025-02-07T04:26:59.8864998Z ##[debug]Evaluating condition for step: 'Checkout'
2025-02-07T04:26:59.8905441Z ##[debug]Evaluating: success()
2025-02-07T04:26:59.8912617Z ##[debug]Evaluating success:
2025-02-07T04:26:59.8934032Z ##[debug]=> true
2025-02-07T04:26:59.8940406Z ##[debug]Result: true
2025-02-07T04:26:59.8963574Z ##[debug]Starting: Checkout
2025-02-07T04:26:59.9050170Z ##[debug]Register post job cleanup for action: actions/checkout@v4
2025-02-07T04:26:59.9134044Z ##[debug]Loading inputs
2025-02-07T04:26:59.9142341Z ##[debug]Evaluating: github.repository
2025-02-07T04:26:59.9144568Z ##[debug]Evaluating Index:
2025-02-07T04:26:59.9147153Z ##[debug]..Evaluating github:
2025-02-07T04:26:59.9148429Z ##[debug]..=> Object
2025-02-07T04:26:59.9154330Z ##[debug]..Evaluating String:
2025-02-07T04:26:59.9155411Z ##[debug]..=> 'repository'
2025-02-07T04:26:59.9159754Z ##[debug]=> 'sobird/actions'
2025-02-07T04:26:59.9162060Z ##[debug]Result: 'sobird/actions'
2025-02-07T04:26:59.9167504Z ##[debug]Evaluating: github.token
2025-02-07T04:26:59.9168715Z ##[debug]Evaluating Index:
2025-02-07T04:26:59.9169681Z ##[debug]..Evaluating github:
2025-02-07T04:26:59.9170636Z ##[debug]..=> Object
2025-02-07T04:26:59.9171553Z ##[debug]..Evaluating String:
2025-02-07T04:26:59.9172473Z ##[debug]..=> 'token'
2025-02-07T04:26:59.9174049Z ##[debug]=> '***'
2025-02-07T04:26:59.9175324Z ##[debug]Result: '***'
2025-02-07T04:26:59.9206391Z ##[debug]Loading env
2025-02-07T04:26:59.9305714Z ##[group]Run actions/checkout@v4
2025-02-07T04:26:59.9307043Z with:
2025-02-07T04:26:59.9307856Z   repository: sobird/actions
2025-02-07T04:26:59.9309049Z   token: ***
2025-02-07T04:26:59.9310078Z   ssh-strict: true
2025-02-07T04:26:59.9310897Z   ssh-user: git
2025-02-07T04:26:59.9312324Z   persist-credentials: true
2025-02-07T04:26:59.9313281Z   clean: true
2025-02-07T04:26:59.9314400Z   sparse-checkout-cone-mode: true
2025-02-07T04:26:59.9315377Z   fetch-depth: 1
2025-02-07T04:26:59.9316225Z   fetch-tags: false
2025-02-07T04:26:59.9317078Z   show-progress: true
2025-02-07T04:26:59.9317981Z   lfs: false
2025-02-07T04:26:59.9319349Z   submodules: false
2025-02-07T04:26:59.9320327Z   set-safe-directory: true
2025-02-07T04:26:59.9321588Z ##[endgroup]
2025-02-07T04:27:00.1495254Z ##[debug]GITHUB_WORKSPACE = '/home/runner/work/actions/actions'
2025-02-07T04:27:00.1497572Z ##[debug]qualified repository = 'sobird/actions'
2025-02-07T04:27:00.1499239Z ##[debug]ref = 'refs/tags/v0.0.3'
2025-02-07T04:27:00.1501111Z ##[debug]commit = '257edfd7dc279e0086cdc0dfb12532272177506d'
2025-02-07T04:27:00.1502955Z ##[debug]clean = true
2025-02-07T04:27:00.1504586Z ##[debug]filter = undefined
2025-02-07T04:27:00.1506283Z ##[debug]fetch depth = 1
2025-02-07T04:27:00.1507535Z ##[debug]fetch tags = false
2025-02-07T04:27:00.1508989Z ##[debug]show progress = true
2025-02-07T04:27:00.1510410Z ##[debug]lfs = false
2025-02-07T04:27:00.1511617Z ##[debug]submodules = false
2025-02-07T04:27:00.1512996Z ##[debug]recursive submodules = false
2025-02-07T04:27:00.1517082Z ##[debug]GitHub Host URL = 
2025-02-07T04:27:00.1525857Z ::add-matcher::/home/runner/work/_actions/actions/checkout/v4/dist/problem-matcher.json
2025-02-07T04:27:00.1683990Z ##[debug]Added matchers: 'checkout-git'. Problem matchers scan action output for known warning or error strings and report these inline.
2025-02-07T04:27:00.1689966Z Syncing repository: sobird/actions
2025-02-07T04:27:00.1691776Z ::group::Getting Git version info
2025-02-07T04:27:00.1694122Z ##[group]Getting Git version info
2025-02-07T04:27:00.1695386Z Working directory is '/home/runner/work/actions/actions'
2025-02-07T04:27:00.1697089Z ##[debug]Getting git version
2025-02-07T04:27:00.1698133Z [command]/usr/bin/git version
2025-02-07T04:27:00.1703974Z git version 2.48.1
2025-02-07T04:27:00.1729583Z ##[debug]0
2025-02-07T04:27:00.1731266Z ##[debug]git version 2.48.1
2025-02-07T04:27:00.1732158Z ##[debug]
2025-02-07T04:27:00.1734299Z ##[debug]Set git useragent to: git/2.48.1 (github-actions-checkout)
2025-02-07T04:27:00.1736508Z ::endgroup::
2025-02-07T04:27:00.1737367Z ##[endgroup]
2025-02-07T04:27:00.1746808Z ::add-mask::***
2025-02-07T04:27:00.1754318Z Temporarily overriding HOME='/home/runner/work/_temp/4a94f8c4-2959-4ce3-af04-b5838603b39a' before making global git config changes
2025-02-07T04:27:00.1759342Z Adding repository directory to the temporary git global config as a safe directory
2025-02-07T04:27:00.1772458Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/actions/actions
2025-02-07T04:27:00.1808015Z ##[debug]0
2025-02-07T04:27:00.1809413Z ##[debug]
2025-02-07T04:27:00.1815027Z Deleting the contents of '/home/runner/work/actions/actions'
2025-02-07T04:27:00.1818565Z ::group::Initializing the repository
2025-02-07T04:27:00.1819669Z ##[group]Initializing the repository
2025-02-07T04:27:00.1823468Z [command]/usr/bin/git init /home/runner/work/actions/actions
2025-02-07T04:27:00.1885557Z hint: Using 'master' as the name for the initial branch. This default branch name
2025-02-07T04:27:00.1887373Z hint: is subject to change. To configure the initial branch name to use in all
2025-02-07T04:27:00.1888998Z hint: of your new repositories, which will suppress this warning, call:
2025-02-07T04:27:00.1890190Z hint:
2025-02-07T04:27:00.1890998Z hint: 	git config --global init.defaultBranch <name>
2025-02-07T04:27:00.1892021Z hint:
2025-02-07T04:27:00.1893026Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
2025-02-07T04:27:00.1895100Z hint: 'development'. The just-created branch can be renamed via this command:
2025-02-07T04:27:00.1896449Z hint:
2025-02-07T04:27:00.1897144Z hint: 	git branch -m <name>
2025-02-07T04:27:00.1899333Z Initialized empty Git repository in /home/runner/work/actions/actions/.git/
2025-02-07T04:27:00.1905183Z ##[debug]0
2025-02-07T04:27:00.1907170Z ##[debug]Initialized empty Git repository in /home/runner/work/actions/actions/.git/
2025-02-07T04:27:00.1908628Z ##[debug]
2025-02-07T04:27:00.1914471Z [command]/usr/bin/git remote add origin https://github.com/sobird/actions
2025-02-07T04:27:00.1946945Z ##[debug]0
2025-02-07T04:27:00.1951300Z ##[debug]
2025-02-07T04:27:00.1952725Z ::endgroup::
2025-02-07T04:27:00.1953517Z ##[endgroup]
2025-02-07T04:27:00.1955177Z ::group::Disabling automatic garbage collection
2025-02-07T04:27:00.1956413Z ##[group]Disabling automatic garbage collection
2025-02-07T04:27:00.1957993Z [command]/usr/bin/git config --local gc.auto 0
2025-02-07T04:27:00.1994884Z ##[debug]0
2025-02-07T04:27:00.2001615Z ##[debug]
2025-02-07T04:27:00.2003011Z ::endgroup::
2025-02-07T04:27:00.2004143Z ##[endgroup]
2025-02-07T04:27:00.2008155Z ::group::Setting up auth
2025-02-07T04:27:00.2008995Z ##[group]Setting up auth
2025-02-07T04:27:00.2010458Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-02-07T04:27:00.2039568Z ##[debug]1
2025-02-07T04:27:00.2040921Z ##[debug]
2025-02-07T04:27:00.2043046Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-02-07T04:27:00.2323521Z ##[debug]0
2025-02-07T04:27:00.2331467Z ##[debug]
2025-02-07T04:27:00.2333028Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-02-07T04:27:00.2476225Z ##[debug]1
2025-02-07T04:27:00.2527987Z ##[debug]
2025-02-07T04:27:00.2532515Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-02-07T04:27:00.2648138Z ##[debug]0
2025-02-07T04:27:00.2650570Z ##[debug]
2025-02-07T04:27:00.2659273Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
2025-02-07T04:27:00.2695163Z ##[debug]0
2025-02-07T04:27:00.2698836Z ##[debug]
2025-02-07T04:27:00.2704727Z ::endgroup::
2025-02-07T04:27:00.2705533Z ##[endgroup]
2025-02-07T04:27:00.2707831Z ::group::Fetching the repository
2025-02-07T04:27:00.2708878Z ##[group]Fetching the repository
2025-02-07T04:27:00.2715924Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +257edfd7dc279e0086cdc0dfb12532272177506d:refs/tags/v0.0.3
2025-02-07T04:27:00.6402676Z From https://github.com/sobird/actions
2025-02-07T04:27:00.6405210Z  * [new ref]         257edfd7dc279e0086cdc0dfb12532272177506d -> v0.0.3
2025-02-07T04:27:00.6415995Z ##[debug]0
2025-02-07T04:27:00.6420195Z ##[debug]
2025-02-07T04:27:00.6434514Z ::endgroup::
2025-02-07T04:27:00.6435658Z ##[endgroup]
2025-02-07T04:27:00.6437698Z ::group::Determining the checkout info
2025-02-07T04:27:00.6439177Z ##[group]Determining the checkout info
2025-02-07T04:27:00.6443029Z ::endgroup::
2025-02-07T04:27:00.6444344Z ##[endgroup]
2025-02-07T04:27:00.6449298Z [command]/usr/bin/git sparse-checkout disable
2025-02-07T04:27:00.6510245Z ##[debug]0
2025-02-07T04:27:00.6514019Z ##[debug]
2025-02-07T04:27:00.6521948Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
2025-02-07T04:27:00.6575367Z ##[debug]0
2025-02-07T04:27:00.6579176Z ##[debug]
2025-02-07T04:27:00.6581151Z ::group::Checking out the ref
2025-02-07T04:27:00.6582520Z ##[group]Checking out the ref
2025-02-07T04:27:00.6595591Z [command]/usr/bin/git checkout --progress --force refs/tags/v0.0.3
2025-02-07T04:27:00.7029608Z Note: switching to 'refs/tags/v0.0.3'.
2025-02-07T04:27:00.7032554Z 
2025-02-07T04:27:00.7035492Z You are in 'detached HEAD' state. You can look around, make experimental
2025-02-07T04:27:00.7049200Z changes and commit them, and you can discard any commits you make in this
2025-02-07T04:27:00.7053464Z state without impacting any branches by switching back to a branch.
2025-02-07T04:27:00.7056623Z 
2025-02-07T04:27:00.7060206Z If you want to create a new branch to retain commits you create, you may
2025-02-07T04:27:00.7066909Z do so (now or later) by using -c with the switch command. Example:
2025-02-07T04:27:00.7069824Z 
2025-02-07T04:27:00.7073674Z   git switch -c <new-branch-name>
2025-02-07T04:27:00.7076359Z 
2025-02-07T04:27:00.7078175Z Or undo this operation with:
2025-02-07T04:27:00.7085826Z 
2025-02-07T04:27:00.7086567Z   git switch -
2025-02-07T04:27:00.7087499Z 
2025-02-07T04:27:00.7088839Z Turn off this advice by setting config variable advice.detachedHead to false
2025-02-07T04:27:00.7090822Z 
2025-02-07T04:27:00.7091544Z HEAD is now at 257edfd 0.0.3
2025-02-07T04:27:00.7094812Z ##[debug]0
2025-02-07T04:27:00.7097272Z ##[debug]
2025-02-07T04:27:00.7099755Z ::endgroup::
2025-02-07T04:27:00.7101342Z ##[endgroup]
2025-02-07T04:27:00.7106895Z ##[debug]0
2025-02-07T04:27:00.7110885Z ##[debug]commit 257edfd7dc279e0086cdc0dfb12532272177506d
2025-02-07T04:27:00.7113509Z ##[debug]Author: sobird <i@sobird.me>
2025-02-07T04:27:00.7116139Z ##[debug]Date:   Fri Feb 7 12:25:59 2025 +0800
2025-02-07T04:27:00.7118077Z ##[debug]
2025-02-07T04:27:00.7119438Z ##[debug]    0.0.3
2025-02-07T04:27:00.7120850Z ##[debug]
2025-02-07T04:27:00.7122575Z [command]/usr/bin/git log -1 --format=%H
2025-02-07T04:27:00.7145351Z 257edfd7dc279e0086cdc0dfb12532272177506d
2025-02-07T04:27:00.7175999Z ##[debug]0
2025-02-07T04:27:00.7178990Z ##[debug]257edfd7dc279e0086cdc0dfb12532272177506d
2025-02-07T04:27:00.7181048Z ##[debug]
2025-02-07T04:27:00.7184025Z ##[debug]Unsetting HOME override
2025-02-07T04:27:00.7191101Z ::remove-matcher owner=checkout-git::
2025-02-07T04:27:00.7207980Z ##[debug]Removed matchers: 'checkout-git'
2025-02-07T04:27:00.7266771Z ##[debug]Node Action run completed with exit code 0
2025-02-07T04:27:00.7314815Z ##[debug]Save intra-action state isPost = true
2025-02-07T04:27:00.7317114Z ##[debug]Save intra-action state setSafeDirectory = true
2025-02-07T04:27:00.7319992Z ##[debug]Save intra-action state repositoryPath = /home/runner/work/actions/actions
2025-02-07T04:27:00.7327690Z ##[debug]Set output commit = 257edfd7dc279e0086cdc0dfb12532272177506d
2025-02-07T04:27:00.7330723Z ##[debug]Set output ref = refs/tags/v0.0.3
2025-02-07T04:27:00.7340387Z ##[debug]Finishing: Checkout`;
export default function Home() {
  // const monacoRef = useRef(null);

  function handleEditorDidMount(editor, monaco: Monaco) {
    // monacoRef.current = monaco;

    monaco.languages.register({ id: 'myLanguage' });

    monaco.languages.setMonarchTokensProvider('myLanguage', {
      keywords: ['error', 'WARNING', 'info', 'success'], // 关键词列表
      tokenizer: {
        root: [
          [/##\[group\]/, 'group-start'], // 匹配分组开始标记
          [/##\[endgroup\]/, 'group-end'], // 匹配分组结束标记
          [/##\[(info|error|warning|success)\]/, 'log-level'],
          // [/.*/, 'default-content'], // 默认内容
        ],
        log: [
          [/\[[0-9]{2}:[0-9]{2}:[0-9]{2}\]/, { token: '@rematch', next: '@pop' }],
          [/.*/, 'log-content'], // 日志内容
        ],
      },
    });

    monaco.languages.registerFoldingRangeProvider('myLanguage', {
      provideFoldingRanges: (model, context, token) => {
        const foldingRanges = [];
        const lines = model.getLinesContent();

        let groupStartLine = -1;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          // 检测 ##[group] 标记
          if (/##\[group\]/.test(line)) {
            groupStartLine = i + 1; // Monaco 的行号从 1 开始
          }

          // 检测 ##[endgroup] 标记
          if (/##\[endgroup\]/.test(line) && groupStartLine !== -1) {
            foldingRanges.push({
              start: groupStartLine,
              end: i + 1, // Monaco 的行号从 1 开始
              kind: monaco.languages.FoldingRangeKind.Region, // 使用 Region 类型
            });
            groupStartLine = -1; // 重置起始行
          }
        }

        return foldingRanges;
      },
    });

    monaco.editor.defineTheme('logTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'group-start', foreground: '008000', fontStyle: 'bold' }, // 分组开始标记
        { token: 'group-end', foreground: '008000', fontStyle: 'bold' },
        // { token: 'log-level.info', foreground: '0000FF' }, // 信息级别
        // { token: 'log-level.error', foreground: 'FF0000' }, // 错误级别
        // { token: 'log-level.debug', foreground: 'FFA500' }, // 警告级别
        // { token: 'log-level.success', foreground: '008000' }, // 成功级别
        // { token: 'default-content', foreground: '000000' }, // 默认内容
      ],
      colors: {
        // 'editorCursor.foreground': 'transparent',
      },
    });

    monaco.editor.setTheme('logTheme');
    // here is another way to get monaco instance
    // you can also store it in `useRef` for further usage
    // monacoRef.current = monaco;

    // setInterval(() => {
    //   const newLogEntry = `[${new Date().toISOString()}] INFO: 新日志条目\n`;
    //   const currentValue = editor.getValue();
    //   editor.setValue(currentValue + newLogEntry);

    //   // monacoRef.current?.setValue(logText);
    //   editor.revealLine(editor.getModel()?.getLineCount() || 0);
    // }, 3000); // 每5秒添加一条新日志

    // 默认折叠所有分组
    // const foldingController = editor.getContribution('editor.contrib.folding');
    // if (foldingController) {
    //   // 等待编辑器内容渲染完成
    //   setTimeout(() => {
    //     foldingController.toggleFold(monaco.languages.FoldingRangeKind.Region);
    //   }, 500); // 延迟 500ms 确保折叠范围已加载
    // }
  }

  //   const logData = `[2023-10-01 12:00:00] INFO: 系统启动
  // [2023-10-01 12:01:00] DEBUG: 初始化完成
  // [2023-10-01 12:02:00] ERROR: 发生错误
  // [2023-10-01 12:03:00] WARNING: 警告信息
  // [12:34:56] <info> This is an info message\n[12:35:00] <error> This is an error message
  // `;

  return (
    <div>
      <Editor
        theme='logTheme'
        height='90vh'
        language='myLanguage'
        defaultValue={logContent}
        onMount={handleEditorDidMount}
        options={{
          readOnly: true,
          wordWrap: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          folding: true, // 启用代码折叠
          // foldingStrategy: 'indentation', // 根据缩进自动折叠
        }}
      />
    </div>
  );
}
