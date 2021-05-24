import { readFileSync } from 'fs'
import { basename } from 'path'
import * as ts from 'typescript'

export function readAndParseTSFile(filePath: string) {
  return parseTSFile(filePath, readFileSync(filePath, 'utf8'))
}

export function parseTSFile(filePath: string, content = '') {
  return ts.createSourceFile(basename(filePath), content, ts.ScriptTarget.Latest)
}

export function parseTS(content: string) {
  return ts.createSourceFile('', content, ts.ScriptTarget.Latest)
}

export function filterTSNodesByKind<K>(source: ts.Node | undefined, kind: ts.SyntaxKind) {
  return (source ? (getTSChildNodes(source).filter(node => node.kind === kind) as any) : []) as K[]
}

export function getTSChildNodes(node: ts.Node) {
  const children: ts.Node[] = []
  if (node) {
    ts.forEachChild(node, child => {
      children.push(child)
    })
  }
  return children
}

export function traverseTSNodes<T extends ts.Node>(
  node: ts.Node,
  filter: (node: ts.Node, depth: number) => boolean,
  depth = 0,
): T | undefined {
  const children = getTSChildNodes(node)
  for (const child of children) {
    if (filter(child, depth)) {
      return child as T
    }
    const value = traverseTSNodes<T>(child, filter, depth + 1)
    if (value) {
      return value as T
    }
  }
}

type FilterType = ((node: ts.Node) => boolean) | ts.SyntaxKind

export function selectTSNode<T>(node: ts.Node | undefined, ...filters: FilterType[]) {
  let nextNode: ts.Node | undefined = node
  for (const filter of filters) {
    if (!nextNode) {
      return
    }
    nextNode = traverseTSNodes(
      nextNode,
      typeof filter === 'function' ? filter : node => node.kind === filter,
    )
  }
  return nextNode as any as T
}

export function selectTSNodes<T>(node: ts.Node | undefined, ...filters: FilterType[]) {
  const matchingNodes: T[] = []
  let nextNode: ts.Node | undefined = node
  for (const filter of filters) {
    if (!nextNode) {
      return
    }
    nextNode = traverseTSNodes(nextNode, (target: ts.Node) => {
      const filterFun =
        typeof filter === 'function' ? filter : (node: ts.Node) => node.kind === filter
      if (filterFun(target)) {
        matchingNodes.push(target as any)
      }
      return false
    })
  }
  return matchingNodes
}

export function propertyAssignmentSelector(name: string) {
  return (node: ts.Node) =>
    ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && getTSNodeName(node.name) === name
}

export function callExpressionSelector(name: string | ts.SyntaxKind) {
  return (node: ts.Node) => {
    if (!ts.isCallExpression(node)) {
      return false
    }
    const firstChild = getTSChildNodes(node)?.[0]
    return ts.isToken(firstChild)
      ? firstChild.kind === name
      : ts.isIdentifier(firstChild)
      ? firstChild.escapedText === name
      : false
  }
}

export function propertyAccessExpressionSelector(...names: string[]) {
  return (node: ts.Node) => {
    if (!ts.isPropertyAccessExpression(node)) {
      return false
    }
    return ts.isIdentifier(node.name) ? names.includes(node.name.escapedText as any) : false
  }
}

export function newExpressionSelector(name: string | ts.SyntaxKind) {
  return (node: ts.Node) => {
    if (!ts.isNewExpression(node)) {
      return false
    }
    const firstChild = getTSChildNodes(node)?.[0]
    return ts.isToken(firstChild)
      ? firstChild.kind === name
      : ts.isIdentifier(firstChild)
      ? firstChild.escapedText === name
      : false
  }
}

export function getTSNodeName(
  name: ts.Identifier | ts.QualifiedName | ts.StringLiteral | undefined,
) {
  if (name === undefined) {
    return undefined
  }
  return (name as ts.Identifier).escapedText as string
}

export function printTS(
  node: Node | undefined,
  sourceFile: ts.SourceFile = parseTSFile('./test.ts', ''),
) {
  if (node == undefined) {
    return ''
  }
  return ts
    .createPrinter({
      newLine: ts.NewLineKind.LineFeed,
      omitTrailingSemicolon: true,
    })
    .printNode(ts.EmitHint.Unspecified, node as any, sourceFile)
}

export function printTSTree(node: ts.Node) {
  traverseTSNodes(node, (node: ts.Node, depth: number) => {
    console.log(new Array(depth + 1).fill('--').join('') + ' ' + ts.SyntaxKind[node.kind])
    return false
  })
}
