export interface FileCommandExtension {
  contextKey: string;
  filePrefix: string;
  process: () => void | Promise<void>;
}
