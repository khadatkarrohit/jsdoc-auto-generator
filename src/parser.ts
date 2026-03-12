import { parse, AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

export interface FunctionParam {
  name: string;
  type: string;
}

export interface FunctionInfo {
  name: string;
  params: FunctionParam[];
  returnType: string;
  startLine: number;
}

function typeAnnotationToString(typeAnnotation: TSESTree.TypeNode | undefined | null): string {
  if (!typeAnnotation) return 'any';

  switch (typeAnnotation.type) {
    case AST_NODE_TYPES.TSStringKeyword:
      return 'string';
    case AST_NODE_TYPES.TSNumberKeyword:
      return 'number';
    case AST_NODE_TYPES.TSBooleanKeyword:
      return 'boolean';
    case AST_NODE_TYPES.TSVoidKeyword:
      return 'void';
    case AST_NODE_TYPES.TSAnyKeyword:
      return 'any';
    case AST_NODE_TYPES.TSNullKeyword:
      return 'null';
    case AST_NODE_TYPES.TSUndefinedKeyword:
      return 'undefined';
    case AST_NODE_TYPES.TSNeverKeyword:
      return 'never';
    case AST_NODE_TYPES.TSUnknownKeyword:
      return 'unknown';
    case AST_NODE_TYPES.TSTypeReference: {
      const ref = typeAnnotation as TSESTree.TSTypeReference;
      const name =
        ref.typeName.type === AST_NODE_TYPES.Identifier
          ? ref.typeName.name
          : 'unknown';
      if (ref.typeArguments && ref.typeArguments.params.length > 0) {
        const args = ref.typeArguments.params
          .map((p) => typeAnnotationToString(p))
          .join(', ');
        return `${name}<${args}>`;
      }
      return name;
    }
    case AST_NODE_TYPES.TSArrayType: {
      const arr = typeAnnotation as TSESTree.TSArrayType;
      return `${typeAnnotationToString(arr.elementType)}[]`;
    }
    case AST_NODE_TYPES.TSUnionType: {
      const union = typeAnnotation as TSESTree.TSUnionType;
      return union.types.map((t) => typeAnnotationToString(t)).join(' | ');
    }
    case AST_NODE_TYPES.TSIntersectionType: {
      const inter = typeAnnotation as TSESTree.TSIntersectionType;
      return inter.types.map((t) => typeAnnotationToString(t)).join(' & ');
    }
    case AST_NODE_TYPES.TSLiteralType: {
      const lit = typeAnnotation as TSESTree.TSLiteralType;
      if ('value' in lit.literal) {
        return JSON.stringify(lit.literal.value);
      }
      return 'literal';
    }
    case AST_NODE_TYPES.TSObjectKeyword:
      return 'object';
    case AST_NODE_TYPES.TSFunctionType:
      return 'Function';
    case AST_NODE_TYPES.TSTupleType: {
      const tuple = typeAnnotation as TSESTree.TSTupleType;
      const elements = tuple.elementTypes.map((e) => typeAnnotationToString(e)).join(', ');
      return `[${elements}]`;
    }
    default:
      return 'unknown';
  }
}

function paramToInfo(param: TSESTree.Parameter): FunctionParam {
  switch (param.type) {
    case AST_NODE_TYPES.Identifier: {
      const id = param as TSESTree.Identifier;
      return {
        name: id.name,
        type: typeAnnotationToString(id.typeAnnotation?.typeAnnotation),
      };
    }
    case AST_NODE_TYPES.AssignmentPattern: {
      const assign = param as TSESTree.AssignmentPattern;
      if (assign.left.type === AST_NODE_TYPES.Identifier) {
        return {
          name: (assign.left as TSESTree.Identifier).name,
          type: typeAnnotationToString(
            (assign.left as TSESTree.Identifier).typeAnnotation?.typeAnnotation
          ),
        };
      }
      return { name: '...', type: 'any' };
    }
    case AST_NODE_TYPES.RestElement: {
      const rest = param as TSESTree.RestElement;
      const innerName =
        rest.argument.type === AST_NODE_TYPES.Identifier
          ? `...${(rest.argument as TSESTree.Identifier).name}`
          : '...args';
      return {
        name: innerName,
        type: typeAnnotationToString(rest.typeAnnotation?.typeAnnotation),
      };
    }
    case AST_NODE_TYPES.ObjectPattern:
      return { name: '{...}', type: typeAnnotationToString((param as TSESTree.ObjectPattern).typeAnnotation?.typeAnnotation) };
    case AST_NODE_TYPES.ArrayPattern:
      return { name: '[...]', type: typeAnnotationToString((param as TSESTree.ArrayPattern).typeAnnotation?.typeAnnotation) };
    default:
      return { name: 'param', type: 'any' };
  }
}

function extractFunctionInfo(
  node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression,
  parent: TSESTree.Node | null
): FunctionInfo {
  const params: FunctionParam[] = node.params.map(paramToInfo);

  const returnType = node.returnType
    ? typeAnnotationToString(node.returnType.typeAnnotation)
    : 'void';

  let name = 'anonymous';

  if (node.type === AST_NODE_TYPES.FunctionDeclaration && node.id) {
    name = node.id.name;
  } else if (parent) {
    if (
      parent.type === AST_NODE_TYPES.VariableDeclarator &&
      (parent as TSESTree.VariableDeclarator).id.type === AST_NODE_TYPES.Identifier
    ) {
      name = ((parent as TSESTree.VariableDeclarator).id as TSESTree.Identifier).name;
    } else if (
      parent.type === AST_NODE_TYPES.MethodDefinition &&
      (parent as TSESTree.MethodDefinition).key.type === AST_NODE_TYPES.Identifier
    ) {
      name = ((parent as TSESTree.MethodDefinition).key as TSESTree.Identifier).name;
    } else if (
      parent.type === AST_NODE_TYPES.Property &&
      (parent as TSESTree.Property).key.type === AST_NODE_TYPES.Identifier
    ) {
      name = ((parent as TSESTree.Property).key as TSESTree.Identifier).name;
    }
  }

  return {
    name,
    params,
    returnType,
    startLine: node.loc?.start.line ?? 0,
  };
}

function findClosestFunction(
  node: TSESTree.Node,
  parent: TSESTree.Node | null,
  cursorLine: number // 0-indexed
): FunctionInfo | null {
  const isFunctionNode =
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression;

  if (isFunctionNode) {
    const fn = node as
      | TSESTree.FunctionDeclaration
      | TSESTree.FunctionExpression
      | TSESTree.ArrowFunctionExpression;
    const startLine = (fn.loc?.start.line ?? 1) - 1; // convert to 0-indexed
    const endLine = (fn.loc?.end.line ?? 1) - 1;

    // For single-expression arrow functions (e.g. `const fn = (x) => x * 2`),
    // body is not a BlockStatement — treat the whole node line as the range
    const isExpressionArrow =
      fn.type === AST_NODE_TYPES.ArrowFunctionExpression &&
      fn.body.type !== AST_NODE_TYPES.BlockStatement;

    const isOnFunctionLine = cursorLine === startLine;
    const isInsideBody = cursorLine > startLine && cursorLine <= endLine;

    if (!isOnFunctionLine && !isInsideBody && !isExpressionArrow) {
      // not in this function's range; recurse into children below
    } else if (isExpressionArrow && !isOnFunctionLine) {
      // skip
    } else {
      // Look for a more specific nested match first (prefer innermost)
      let nested: FunctionInfo | null = null;
      for (const key of Object.keys(fn)) {
        if (key === 'parent') continue;
        const child = (fn as unknown as Record<string, unknown>)[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            for (const item of child) {
              if (item && typeof item === 'object' && 'type' in item) {
                const found = findClosestFunction(item as TSESTree.Node, fn, cursorLine);
                if (found) nested = found;
              }
            }
          } else if ('type' in child) {
            const found = findClosestFunction(child as TSESTree.Node, fn, cursorLine);
            if (found) nested = found;
          }
        }
      }

      // If cursor is directly on the function start line, prefer this function over nested
      if (cursorLine === startLine) {
        return extractFunctionInfo(fn, parent);
      }

      return nested ?? extractFunctionInfo(fn, parent);
    }
  }

  // Recurse into children
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            const found = findClosestFunction(item as TSESTree.Node, node, cursorLine);
            if (found) return found;
          }
        }
      } else if ('type' in child) {
        const found = findClosestFunction(child as TSESTree.Node, node, cursorLine);
        if (found) return found;
      }
    }
  }

  return null;
}

export function parseFunctionAtCursor(code: string, cursorLine: number): FunctionInfo | null {
  try {
    const ast = parse(code, {
      loc: true,
      range: true,
      jsx: true,
      errorOnUnknownASTType: false,
    });

    return findClosestFunction(ast, null, cursorLine);
  } catch {
    return null;
  }
}
