import { readFileSync } from 'fs'
import * as gql from 'graphql'
import { toCamelCase, toClassName } from 'name-util'
import { format } from 'prettier'
import * as ts from 'typescript'
import { extractGQLTypes, GQLObjectType, GQLType } from './extract-gql-types'
import { fixGQLRequest } from './fix-gql-request'
import { parseSchema } from './graphql-util'
import {
  createGQLQuery,
  createImportStatement,
  createInterface,
  createNamedImports,
  parseTS,
  printTS,
  selectTSNode,
} from './typescript-util'
import { ById, reduceToFlatArray } from './util'

const prettierOptions = { ...JSON.parse(readFileSync('.prettierrc', 'utf8')), parser: 'typescript' }

interface Context {
  imports: ById<string[]>
}

function createHook({
  hookName,
  responseType,
  reactHookName,
  gqlVariableName,
  requiredRequestVariables,
}: {
  hookName: string
  responseType: string
  reactHookName: string
  gqlVariableName: string
  requiredRequestVariables: string[]
}) {
  return ts.factory.createFunctionDeclaration(
    undefined,
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    ts.factory.createIdentifier(hookName),
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        ts.factory.createIdentifier('request'),
        undefined,
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('RequestType'), undefined),
        undefined,
      ),
    ],
    undefined,
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          ts.factory.createCallExpression(
            ts.factory.createIdentifier(reactHookName),
            [
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier('RequestType'),
                undefined,
              ),
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier(responseType),
                undefined,
              ),
            ],
            [
              ts.factory.createIdentifier(gqlVariableName),
              ts.factory.createIdentifier('request'),
              createSkip(requiredRequestVariables),
            ].filter(i => !!i) as ts.Expression[],
          ),
        ),
      ],
      true,
    ),
  )
}

function createSkip(requiredVariables: string[]) {
  if (requiredVariables.length === 0) {
    return undefined
  }
  const firstVariable = ts.factory.createPrefixUnaryExpression(
    ts.SyntaxKind.ExclamationToken,
    ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier('request'),
      ts.factory.createIdentifier(requiredVariables[0]),
    ),
  )
  return ts.factory.createObjectLiteralExpression(
    [
      ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier('skip'),
        requiredVariables.slice(1).reduce((a, i) => {
          return ts.factory.createBinaryExpression(
            a,
            ts.factory.createToken(ts.SyntaxKind.BarBarToken),
            ts.factory.createPrefixUnaryExpression(
              ts.SyntaxKind.ExclamationToken,
              ts.factory.createPropertyAccessExpression(
                ts.factory.createIdentifier('request'),
                ts.factory.createIdentifier(i),
              ),
            ),
          )
        }, firstVariable as ts.Expression),
      ),
    ],
    false,
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

function generateUniqueName(def: gql.OperationDefinitionNode) {
  return def.selectionSet.selections
    .map(field => {
      if (field.kind === gql.Kind.FIELD) {
        return toClassName(field.name.value)
      }
    })
    .filter(name => !!name)
    .join('And')
}

function findRequiredRequestVariables(dataTypes: GQLType[]) {
  const request = dataTypes.find(dataType => dataType.name === 'RequestType')
  return request?.fields.filter(field => field.isNonNull).map(field => field.name) ?? []
}

function generateHookForOperation(
  schema: gql.DocumentNode,
  def: gql.DefinitionNode,
  gqlVariableName: string,
  context: Context,
) {
  if (def.kind === gql.Kind.OPERATION_DEFINITION) {
    const dataTypes = extractGQLTypes(schema, def)
    const requiredRequestVariables = findRequiredRequestVariables(dataTypes)
    const statements = dataTypes.map(dataType => {
      if (dataType.type === GQLObjectType.INTERFACE) {
        return createInterface(dataType, dataType.name === 'RequestType')
      }
    })

    const name = generateUniqueName(def)
    const reactHookName = toCamelCase(`use-${def.operation}`)
    const hookName = toCamelCase(`use-${name}-${def.operation}`)
    const responseType = toClassName(`${def.operation}-type`)

    const imports = context.imports['@apollo/react'] ?? (context.imports['@apollo/react'] = [])
    imports.push(reactHookName)

    const hookStatement = createHook({
      hookName,
      responseType,
      reactHookName,
      gqlVariableName,
      requiredRequestVariables,
    })
    return [...statements, hookStatement]
  }
  return []
}

export function generateGQLHook(schema: gql.DocumentNode, tsContent: string): string {
  const request = extractGQL(tsContent)
  const fixedQuery = fixGQLRequest(schema, request.gql)
  const requestDoc = parseSchema(fixedQuery)
  const context = { imports: {} }

  const statements: ts.Statement[] = reduceToFlatArray(
    requestDoc.definitions as gql.DefinitionNode[],
    def => generateHookForOperation(schema, def, request.variable, context),
  ) as any

  return createTSContent([
    createImportStatement('gql', 'graphql-tag'),
    ...createNamedImports(context.imports),
    createGQLQuery(fixedQuery),
    ...statements,
  ])
}
