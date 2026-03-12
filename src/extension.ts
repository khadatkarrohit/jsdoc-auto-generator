import * as vscode from 'vscode';
import { parseFunctionAtCursor } from './parser';
import { generateJsDoc, detectIndentation } from './generator';

const SUPPORTED_LANGUAGES = new Set([
  'typescript',
  'javascript',
  'typescriptreact',
  'javascriptreact',
]);

export function activate(context: vscode.ExtensionContext): void {
  const command = vscode.commands.registerCommand(
    'jsdoc-auto-generator.generate',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active text editor found.');
        return;
      }

      if (!SUPPORTED_LANGUAGES.has(editor.document.languageId)) {
        vscode.window.showInformationMessage(
          'JSDoc generation is only supported for TypeScript and JavaScript files.'
        );
        return;
      }

      const cursorLine = editor.selection.active.line; // 0-indexed
      const code = editor.document.getText();

      const funcInfo = parseFunctionAtCursor(code, cursorLine);

      if (!funcInfo) {
        vscode.window.showInformationMessage(
          'No function found at the cursor position. Place your cursor on or inside a function.'
        );
        return;
      }

      const functionLineIndex = funcInfo.startLine - 1; // convert 1-indexed AST line to 0-indexed
      if (functionLineIndex < 0 || functionLineIndex >= editor.document.lineCount) {
        vscode.window.showErrorMessage('Could not locate the function line in the document.');
        return;
      }

      // Check if JSDoc already exists above the function
      if (functionLineIndex > 0) {
        const lineAbove = editor.document.lineAt(functionLineIndex - 1).text.trim();
        if (lineAbove === '*/' || lineAbove.startsWith('* ') || lineAbove === '/**') {
          vscode.window.showInformationMessage(
            'A JSDoc comment already exists above this function.'
          );
          return;
        }
      }

      const functionLine = editor.document.lineAt(functionLineIndex).text;

      // For arrow functions assigned to variables, the actual line with `const foo =`
      // may precede the function body — walk back to find the actual declaration line
      let insertLineIndex = functionLineIndex;
      if (functionLineIndex > 0) {
        const prevLine = editor.document.lineAt(functionLineIndex - 1).text.trim();
        if (prevLine.startsWith('export') || prevLine.startsWith('const') || prevLine.startsWith('let') || prevLine.startsWith('var')) {
          insertLineIndex = functionLineIndex - 1;
        }
      }

      const indentation = detectIndentation(functionLine);
      const jsDoc = generateJsDoc(funcInfo, indentation);

      await editor.edit((editBuilder) => {
        const insertPosition = new vscode.Position(insertLineIndex, 0);
        editBuilder.insert(insertPosition, jsDoc);
      });
    }
  );

  context.subscriptions.push(command);
}

export function deactivate(): void {
  // Cleanup handled via context.subscriptions
}
