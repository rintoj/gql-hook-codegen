import { readFileSync } from 'fs'
import * as gql from 'graphql'
import { toCamelCase, toClassName } from 'name-util'
import { format } from 'prettier'
import * as ts from 'typescript'
import { ById, reduceToFlatArray } from '../util/util'
import { extractGQLTypes, GQLObjectType, GQLType } from './extract-gql-types'
import { fixGQLRequest } from './fix-gql-request'
import { parseSchema } from './graphql-util'
import {
  createEnum,
  createGQLQuery,
  createImportStatement,
  createInterface,
  createNamedImports,
  parseTS,
  printTS,
  selectTSNode,
} from './typescript-util'

const prettierOptions = { ...JSON.parse(readFileSync('.prettierrc', 'utf8')), parser: 'typescript' }

interface Context {
  imports: ById<string[]>
}

function createQueryHook({
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
  requiredRequestVariables: string[] | undefined
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
                ts.factory.createIdentifier(responseType),
                undefined,
              ),
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier('RequestType'),
                undefined,
              ),
            ],
            [
              ts.factory.createIdentifier(gqlVariableName),
              ts.factory.createObjectLiteralExpression(
                [
                  ts.factory.createPropertyAssignment(
                    ts.factory.createIdentifier('variables'),
                    ts.factory.createIdentifier('request'),
                  ),
                  requiredRequestVariables ? createSkip(requiredRequestVariables) : null,
                ].filter(i => !!i) as any,
                true,
              ),
            ],
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
  return ts.factory.createPropertyAssignment(
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
  )
}

function createMutationHook({
  hookName,
  responseType,
  reactHookName,
  gqlVariableName,
}: {
  hookName: string
  responseType: string
  reactHookName: string
  gqlVariableName: string
}) {
  return ts.factory.createFunctionDeclaration(
    undefined,
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    ts.factory.createIdentifier(hookName),
    undefined,
    [],
    undefined,
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          ts.factory.createCallExpression(
            ts.factory.createIdentifier(reactHookName),
            [
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier(responseType),
                undefined,
              ),
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier('RequestType'),
                undefined,
              ),
            ],
            [ts.factory.createIdentifier(gqlVariableName)].filter(i => !!i) as ts.Expression[],
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
    const name = generateUniqueName(def)
    const operation = def.operation
    const reactHookName = toCamelCase(`use-${operation}`)
    const hookName = toCamelCase(`use-${name}-${operation}`)
    const responseType = toClassName(`${operation}-type`)
    const dataTypes = extractGQLTypes(schema, def)
    const requiredRequestVariables =
      operation === 'query' ? findRequiredRequestVariables(dataTypes) : undefined

    const statements = dataTypes.map(dataType => {
      if (dataType.type === GQLObjectType.INTERFACE) {
        return createInterface(dataType, dataType.name === 'RequestType' && operation === 'query')
      } else if (dataType.type === GQLObjectType.ENUM) {
        return createEnum(dataType)
      }
    })

    const imports = context.imports['@apollo/client'] ?? (context.imports['@apollo/client'] = [])
    imports.push(reactHookName)

    const hookStatement =
      def.operation === 'query'
        ? createQueryHook({
            hookName,
            responseType,
            reactHookName,
            gqlVariableName,
            requiredRequestVariables,
          })
        : createMutationHook({
            hookName,
            responseType,
            reactHookName,
            gqlVariableName,
          })
    return [...statements, hookStatement].filter(i => !!i)
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
    createGQLQuery(fixedQuery, request.variable),
    ...statements,
  ])
}