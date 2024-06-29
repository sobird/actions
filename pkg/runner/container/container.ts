import { Mode } from 'node:fs';

export interface FileEntry {
  name: string;
  mode: Mode;
  body: string;
}
export default abstract class Container {
  abstract copy(...files: FileEntry[]): Promise<void>;
}
