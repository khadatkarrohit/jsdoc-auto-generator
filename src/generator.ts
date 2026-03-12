import type { FunctionInfo } from './parser';

/**
 * Generates a JSDoc comment block string from parsed function information.
 * Returns the full block including the trailing newline, ready to be inserted above the function.
 */
export function generateJsDoc(info: FunctionInfo, indentation = ''): string {
  const lines: string[] = [];

  lines.push(`${indentation}/**`);
  lines.push(`${indentation} * [Description]`);

  if (info.params.length > 0) {
    lines.push(`${indentation} *`);
    for (const param of info.params) {
      lines.push(`${indentation} * @param {${param.type}} ${param.name} - [Description]`);
    }
  }

  if (info.returnType && info.returnType !== 'void') {
    lines.push(`${indentation} *`);
    lines.push(`${indentation} * @returns {${info.returnType}}`);
  }

  lines.push(`${indentation} */`);

  return lines.join('\n') + '\n';
}

/**
 * Detects the indentation (leading whitespace) of a given line.
 */
export function detectIndentation(line: string): string {
  const match = line.match(/^(\s*)/);
  return match ? match[1] : '';
}
