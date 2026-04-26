/**
 * Go语言中的strings.NewReplacer方法实现
 *
 * sobird<i@sobird.me> at 2024/04/26 0:51:45 created.
 */

type Entries = [string, string][];

export class Replacer {
  constructor(private entries: Entries = []) {}

  add(original: string, replacement: string) {
    this.entries.push([original, replacement]);
  }

  replace(content: string): string {
    let result = content;
    this.entries.forEach(([original, replacement]) => {
      result = result.replaceAll(original, replacement);
    });
    return result;
  }
}
