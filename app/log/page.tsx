// oxlint-disable no-useless-escape
'use client';

import Editor, { loader, Monaco } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';

const monacoConfig = {
  paths: {
    vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs',
  },
};

loader.config(monacoConfig);

const PollInterval = 1000;
const FinalStatuses = new Set(['success', 'failure', 'cancelled', 'skipped']);

interface LogRow {
  time: string;
  content: string;
}

interface StepRange {
  index: number;
  name: string;
  logIndex: number;
  logLength: number;
}

interface LogResponse {
  rows: LogRow[];
  nextOffset: number;
  more: boolean;
  task: { status: string; logLength: number; logInStorage: boolean };
  steps: StepRange[];
  error?: string;
}

interface EditorHandle {
  getModel(): {
    getLineMaxColumn(lineNumber: number): number;
    getLineCount(): number;
    applyEdits(
      edits: {
        range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
        text: string;
      }[],
    ): void;
  } | null;
  revealLine(lineNumber: number): void;
}

export default function LogPage() {
  const editorRef = useRef<EditorHandle | null>(null);
  const stepsRef = useRef<StepRange[]>([]);
  const offsetRef = useRef(0);

  useEffect(() => {
    const taskId = new URLSearchParams(window.location.search).get('taskId');
    if (!taskId) {
      return;
    }

    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const append = (text: string) => {
      const model = editorRef.current?.getModel();
      if (!model) {
        return;
      }

      // Insert at the end of the last line so existing folds and the scroll
      // position survive each poll.
      const line = model.getLineCount();
      const column = model.getLineMaxColumn(line);
      model.applyEdits([
        {
          range: { startLineNumber: line, startColumn: column, endLineNumber: line, endColumn: column },
          text,
        },
      ]);
      editorRef.current?.revealLine(model.getLineCount());
    };

    const poll = async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/logs?offset=${offsetRef.current}`);
        const result = (await response.json()) as LogResponse;

        if (stopped) {
          return;
        }
        if (!response.ok) {
          append(`\n${result.error ?? 'failed to read the log'}\n`);
          return;
        }

        if (result.rows.length > 0) {
          append(`${result.rows.map((row) => `${row.time} ${row.content}`).join('\n')}\n`);
        }

        offsetRef.current = result.nextOffset;
        stepsRef.current = result.steps;

        const finished = result.task.logInStorage || FinalStatuses.has(result.task.status);
        if (finished && !result.more) {
          return;
        }

        timer = setTimeout(poll, PollInterval);
      } catch (error) {
        if (!stopped) {
          append(`\n${error instanceof Error ? error.message : String(error)}\n`);
        }
      }
    };

    poll();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  const handleEditorDidMount = (editor: EditorHandle, monaco: Monaco) => {
    editorRef.current = editor;

    monaco.languages.register({ id: 'myLanguage' });

    monaco.languages.setMonarchTokensProvider('myLanguage', {
      keywords: ['error', 'WARNING', 'info', 'success'],
      tokenizer: {
        root: [
          [/##\[group\]/, 'group-start'],
          [/##\[endgroup\]/, 'group-end'],
          [/##\[(info|error|warning|success)\]/, 'log-level'],
        ],
      },
    });

    monaco.languages.registerFoldingRangeProvider('myLanguage', {
      provideFoldingRanges: (model: { getLineContent: (line: number) => string; getLineCount: () => number }) => {
        const foldingRanges = [];
        const lines: string[] = [];
        for (let i = 1; i <= model.getLineCount(); i++) {
          lines.push(model.getLineContent(i).trim());
        }

        // `##[group]` / `##[endgroup]` markers fold the block between them.
        let groupStartLine = -1;
        for (let i = 0; i < lines.length; i++) {
          if (/##\[group\]/.test(lines[i])) {
            groupStartLine = i + 1;
          }
          if (/##\[endgroup\]/.test(lines[i]) && groupStartLine !== -1) {
            foldingRanges.push({ start: groupStartLine, end: i + 1, kind: monaco.languages.FoldingRangeKind.Region });
            groupStartLine = -1;
          }
        }

        // Each step is reported with the line range it produced, so a whole step
        // can be folded even when it has no group markers of its own.
        stepsRef.current.forEach((step) => {
          const start = step.logIndex + 1;
          const end = start + step.logLength - 1;
          if (step.logLength > 0 && end > start && end <= lines.length) {
            foldingRanges.push({ start, end, kind: monaco.languages.FoldingRangeKind.Region });
          }
        });

        return foldingRanges;
      },
    });

    monaco.editor.defineTheme('logTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'group-start', foreground: '008000', fontStyle: 'bold' },
        { token: 'group-end', foreground: '008000', fontStyle: 'bold' },
      ],
      colors: {},
    });

    monaco.editor.setTheme('logTheme');
  };

  return (
    <div>
      <Editor
        theme="logTheme"
        height="90vh"
        language="myLanguage"
        onMount={handleEditorDidMount}
        options={{
          readOnly: true,
          wordWrap: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          folding: true,
        }}
      />
    </div>
  );
}
