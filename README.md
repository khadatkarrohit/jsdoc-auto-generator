# jsdoc-auto-generator

A VS Code extension that generates JSDoc comment blocks for any TypeScript or JavaScript function with one keystroke or right-click. It reads the function signature at your cursor position and auto-fills parameter names, types, and the return type.

## Features

- Parses the full function signature using the TypeScript AST — no regex hacks
- Extracts parameter names and type annotations (including unions, generics, arrays, literals)
- Detects return type from the function signature
- Respects existing indentation when inserting the block
- Skips functions that already have a JSDoc comment above them
- Works with named functions, arrow functions, methods, and anonymous functions

## Example

**Before** (cursor anywhere on or inside the function):

```ts
async function createUser(name: string, age: number, role: 'admin' | 'user'): Promise<User> {
  // ...
}
```

**After** running "Generate JSDoc":

```ts
/**
 * [Description]
 *
 * @param {string} name - [Description]
 * @param {number} age - [Description]
 * @param {'admin' | 'user'} role - [Description]
 *
 * @returns {Promise<User>}
 */
async function createUser(name: string, age: number, role: 'admin' | 'user'): Promise<User> {
  // ...
}
```

## Usage

### Option 1 — Right-click context menu

Right-click anywhere in a `.ts` / `.js` / `.tsx` / `.jsx` file and select **"JSDoc: Generate JSDoc"**.

### Option 2 — Keyboard shortcut

| Platform | Shortcut |
|----------|----------|
| macOS | `Cmd+Alt+J` |
| Windows/Linux | `Ctrl+Alt+J` |

### Option 3 — Command Palette

Open with `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux) and run:

```
JSDoc: Generate JSDoc
```

## Supported function types

| Type | Example |
|------|---------|
| Named function | `function foo(x: number): string` |
| Arrow function | `const foo = (x: number): string =>` |
| Class method | `class A { foo(x: number): void }` |
| Object method | `const obj = { foo(x: number) {} }` |
| Async function | `async function foo(): Promise<void>` |
| Generic function | `function foo<T>(x: T): T` |

## Edge cases handled

- Cursor inside a nested function — generates JSDoc for the innermost matching function
- Arrow functions with expression bodies (`const fn = (x) => x * 2`)
- Destructured parameters — shown as `{...}` or `[...]`
- Rest parameters — shown as `...args`
- Optional parameters with default values

## Development

```bash
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

Then open any TypeScript file, place your cursor on a function, and trigger the command.
