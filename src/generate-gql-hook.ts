import { readFileSync } from 'fs'
import * as gql from 'graphql'
import { toCamelCase, toClassName } from 'name-util'
import { format } from 'prettier'
import * as ts from 'typescript'
import { fixGQLRequest } from './fix-gql-request'
import { parseSchema } from './graphql-util'
import { parseTS, printTS, selectTSNode } from './typescript-util'

const prettierOptions = { ...JSON.parse(readFileSync('.prettierrc', 'utf8')), parser: 'typescript' }

interface Property {
  name: string
  type: string
  isRequired: boolean
}

enum TypeToKeyword {
  'string' = ts.SyntaxKind.StringKeyword,
  'number' = ts.SyntaxKind.NumberKeyword,
  'boolean' = ts.SyntaxKind.BooleanKeyword,
}

function createImportStatement(clause: string, file: string) {
  return ts.factory.createImportDeclaration(
    undefined,
    undefined,
    ts.factory.createImportClause(false, ts.factory.createIdentifier(clause), undefined),
    ts.factory.createStringLiteral(file),
  )
}

function createNamedImportStatement(imports: string[], file: string) {
  return ts.factory.createImportDeclaration(
    undefined,
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports(
        imports.map(importItem =>
          ts.factory.createImportSpecifier(undefined, ts.factory.createIdentifier(importItem)),
        ),
      ),
    ),
    ts.factory.createStringLiteral(file),
  )
}

function createGQLQuery(query: string, variableName = 'query') {
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier(variableName),
          undefined,
          undefined,
          ts.factory.createTaggedTemplateExpression(
            ts.factory.createIdentifier('gql'),
            undefined,
            ts.factory.createNoSubstitutionTemplateLiteral(query),
          ),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  )
}

function createInterface(name: string, properties: Property[]) {
  return ts.factory.createInterfaceDeclaration(
    undefined,
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(name),
    undefined,
    undefined,
    properties.map(property => {
      const type = (TypeToKeyword as any)[property.type]
      return ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier(property.name),
        property.isRequired ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        type
          ? ts.factory.createKeywordTypeNode(type)
          : ts.factory.createTypeReferenceNode(
              ts.factory.createIdentifier(property.type),
              undefined,
            ),
      )
    }),
  )
}

function createHook({
  name,
  requestType,
  responseType,
  reactHook,
  variable,
}: {
  name: string
  requestType: string
  responseType: string
  reactHook: string
  variable: string
}) {
  return ts.factory.createFunctionDeclaration(
    undefined,
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    ts.factory.createIdentifier(name),
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        ts.factory.createIdentifier('request'),
        undefined,
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(requestType), undefined),
        undefined,
      ),
    ],
    undefined,
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          ts.factory.createCallExpression(
            ts.factory.createIdentifier(reactHook),
            [
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier(requestType),
                undefined,
              ),
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier(responseType),
                undefined,
              ),
            ],
            [
              ts.factory.createIdentifier(variable),
              ts.factory.createIdentifier('request'),
              ts.factory.createObjectLiteralExpression(
                [
                  ts.factory.createPropertyAssignment(
                    ts.factory.createIdentifier('skip'),
                    ts.factory.createPrefixUnaryExpression(
                      ts.SyntaxKind.ExclamationToken,
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createIdentifier('request'),
                        ts.factory.createIdentifier('id'),
                      ),
                    ),
                  ),
                ],
                false,
              ),
            ],
          ),
        ),
      ],
      true,
    ),
  )
}

function createTSContent(statements: ts.Statement[]) {
  const tsContent = printTS(
    ts.factory.createSourceFile(
      statements,
      ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
      ts.NodeFlags.Const,
    ) as any,
  )
  return format(tsContent, prettierOptions)
}

function extractGQL(query: string) {
  const sourceFile = parseTS(query)
  const variable = selectTSNode(
    sourceFile,
    node =>
      ts.isVariableDeclaration(node) &&
      !!node.initializer &&
      ts.isTaggedTemplateExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.tag) &&
      node.initializer.tag.escapedText === 'gql',
  ) as ts.VariableDeclaration

  const gql =
    !!variable?.initializer &&
    ts.isTaggedTemplateExpression(variable.initializer) &&
    ts.isNoSubstitutionTemplateLiteral(variable.initializer.template)
      ? (variable.initializer.template.rawText as string)
      : ''

  return {
    gql,
    variable: ts.isIdentifier(variable.name) ? (variable.name.escapedText as string) : '',
  }
}

export function generateUseHook({
  schema,
  operation,
  variable,
  selection,
  context,
}: {
  schema: gql.DocumentNode
  operation: string
  variable: string
  selection: gql.FieldNode
  context: Context
}) {
  const name = selection.name.value
  const reactHook = toCamelCase(`use-${operation}`)
  const hookName = toCamelCase(`use-${name}-${operation}`)
  const requestName = toClassName(`${name}-${operation}-request`)
  const responseName = toClassName(`${name}-${operation}-response`)

  const imports = context.imports['@apollo/react'] ?? (context.imports['@apollo/react'] = [])
  imports.push(reactHook)

  return [
    createInterface('User', [{ name: 'name', type: 'string', isRequired: false }]),
    createInterface(requestName, [{ name: 'id', type: 'string', isRequired: true }]),
    createInterface(responseName, [{ name: 'user', type: 'User', isRequired: false }]),
    createHook({
      name: hookName,
      requestType: requestName,
      responseType: responseName,
      reactHook,
      variable,
    }),
  ]
}

interface ById<T> {
  [id: string]: T
}

interface Context {
  imports: ById<string[]>
}

export function createNamedImports(context: Context) {
  return Object.keys(context.imports).map((fileName: string) => {
    return createNamedImportStatement((context.imports as any)[fileName], fileName)
  })
}

export function generateGQLHook(schema: gql.DocumentNode, tsContent: string): string {
  const request = extractGQL(tsContent)
  const fixedQuery = fixGQLRequest(schema, request.gql)
  const requestDoc = parseSchema(fixedQuery)
  const context = { imports: {} }

  const statements = requestDoc.definitions.reduce((statements, def) => {
    if (def.kind === gql.Kind.OPERATION_DEFINITION) {
      return [
        ...statements,
        ...def.selectionSet.selections.reduce(
          (a, selectionSet) => [
            ...a,
            ...generateUseHook({
              schema,
              operation: def.operation,
              variable: request.variable,
              selection: selectionSet as gql.FieldNode,
              context,
            }),
          ],
          [] as ts.Statement[],
        ),
      ]
    }
    return statements
  }, [] as ts.Statement[])

  return createTSContent([
    createImportStatement('gql', 'graphql-tag'),
    ...createNamedImports(context),
    createGQLQuery(fixedQuery),
    ...statements,
  ])
}
