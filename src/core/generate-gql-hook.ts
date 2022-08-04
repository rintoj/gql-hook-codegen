import * as gql from 'graphql'
import { toCamelCase, toClassName, toDashedName } from 'name-util'
import { format, Options } from 'prettier'
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
  createUnion,
  parseTS,
  printTS,
  selectTSNode,
} from './typescript-util'

interface Context {
  imports: ById<string[]>
  packageName: string
}

function createQueryHook({
  hookName,
  responseType,
  reactHookName,
  gqlVariableName,
  isLazyQuery,
  requiredRequestVariables,
  hasVariables,
}: {
  hookName: string
  responseType: string
  reactHookName: string
  gqlVariableName: string
  isLazyQuery: boolean
  requiredRequestVariables: string[] | undefined
  hasVariables: boolean
}) {
  return ts.factory.createFunctionDeclaration(
    undefined,
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    ts.factory.createIdentifier(hookName),
    undefined,
    [
      hasVariables
        ? ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            ts.factory.createIdentifier('request'),
            undefined,
            ts.factory.createTypeReferenceNode(
              ts.factory.createIdentifier('RequestType'),
              undefined,
            ),
            undefined,
          )
        : (undefined as any),
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        ts.factory.createIdentifier('options'),
        ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        ts.factory.createTypeReferenceNode(
          ts.factory.createIdentifier(isLazyQuery ? 'LazyQueryHookOptions' : 'QueryHookOptions'),
          [
            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('QueryType'), undefined),
            ts.factory.createTypeReferenceNode(
              ts.factory.createIdentifier(hasVariables ? 'RequestType' : 'void'),
              undefined,
            ),
          ],
        ),
        undefined,
      ),
    ].filter(i => !!i),

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
                ts.factory.createIdentifier(hasVariables ? 'RequestType' : 'void'),
                undefined,
              ),
            ],
            [
              ts.factory.createIdentifier(gqlVariableName),
              hasVariables
                ? ts.factory.createObjectLiteralExpression(
                    [
                      ts.factory.createPropertyAssignment(
                        ts.factory.createIdentifier('variables'),
                        ts.factory.createIdentifier('request'),
                      ),
                      !isLazyQuery && requiredRequestVariables
                        ? createSkip(requiredRequestVariables)
                        : null,
                      ts.factory.createSpreadAssignment(ts.factory.createIdentifier('options')),
                    ].filter(i => !!i) as any,
                    true,
                  )
                : ts.factory.createIdentifier('options'),
            ].filter(i => !!i) as any,
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
  hasVariables,
}: {
  hookName: string
  responseType: string
  reactHookName: string
  gqlVariableName: string
  hasVariables?: boolean
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
        ts.factory.createIdentifier('options'),
        ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('MutationHookOptions'), [
          ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier('MutationType'),
            undefined,
          ),
          ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier(hasVariables ? 'RequestType' : 'void'),
            undefined,
          ),
        ]),
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
                ts.factory.createIdentifier(hasVariables ? 'RequestType' : 'void'),
                undefined,
              ),
            ],
            [ts.factory.createIdentifier(gqlVariableName), ts.factory.createIdentifier('options')],
          ),
        ),
      ],
      true,
    ),
  )
}

function createTSContent(
  statements: ts.Statement[],
  options?: { blankLinesBetweenStatements: boolean },
) {
  return statements
    .map(statement => printTS(statement as any))
    .join(options?.blankLinesBetweenStatements ? '\n\n' : '\n')
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

function hasRequestVariables(dataTypes: GQLType[]) {
  const request = dataTypes.find(dataType => dataType.name === 'RequestType')
  return !!request?.fields.length
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
    const isLazyQuery = toDashedName(gqlVariableName)
      .split('-')
      .map(i => i.toLocaleLowerCase())
      .includes('lazy')

    const name = generateUniqueName(def)
    const operation = def.operation
    const hookName = toCamelCase(`use-${name}-${operation}`)
    const reactHookName =
      operation === 'query' && isLazyQuery ? 'useLazyQuery' : toCamelCase(`use-${operation}`)
    const optionsName =
      operation === 'query' && isLazyQuery
        ? 'LazyQueryHookOptions'
        : toClassName(`${operation}-HookOptions`)
    const responseType = toClassName(`${operation}-type`)
    const dataTypes = extractGQLTypes(schema, def)
    const requiredRequestVariables =
      operation === 'query' ? findRequiredRequestVariables(dataTypes) : undefined

    const statements = dataTypes.map(dataType => {
      if (dataType.type === GQLObjectType.INTERFACE && !!dataType.fields.length) {
        return createInterface(dataType, dataType.name === 'RequestType' && operation === 'query')
      } else if (dataType.type === GQLObjectType.ENUM) {
        return createEnum(dataType)
      } else if (dataType.type === GQLObjectType.UNION) {
        return createUnion(dataType)
      }
    })

    const imports =
      context.imports[context.packageName] ?? (context.imports[context.packageName] = [])
    imports.push(optionsName)
    imports.push(reactHookName)

    const hookStatement =
      def.operation === 'query'
        ? createQueryHook({
            hookName,
            responseType,
            reactHookName,
            gqlVariableName,
            isLazyQuery,
            requiredRequestVariables,
            hasVariables: hasRequestVariables(dataTypes),
          })
        : createMutationHook({
            hookName,
            responseType,
            reactHookName,
            gqlVariableName,
            hasVariables: hasRequestVariables(dataTypes),
          })
    return [...statements, hookStatement].filter(i => !!i)
  }
  return []
}

function sortImportsByFilename(import1: ts.ImportDeclaration, import2: ts.ImportDeclaration) {
  return (import1.moduleSpecifier as ts.StringLiteral).text.localeCompare(
    (import2.moduleSpecifier as ts.StringLiteral).text,
  )
}

interface GenerateGQLHookOptions {
  prettierOptions?: Options
  packageName: string
}

export function generateGQLHook(
  schema: gql.DocumentNode,
  tsContent: string,
  options: GenerateGQLHookOptions = { packageName: '@apollo/client' },
): string {
  const request = extractGQL(tsContent)
  const fixedQuery = fixGQLRequest(schema, request.gql)
  const requestDoc = parseSchema(fixedQuery)
  const context = { imports: {}, packageName: options.packageName }

  const statements: ts.Statement[] = reduceToFlatArray(
    requestDoc.definitions as gql.DefinitionNode[],
    def => generateHookForOperation(schema, def, request.variable, context),
  ) as any

  const imports = createTSContent(
    [createImportStatement('gql', 'graphql-tag'), ...createNamedImports(context.imports)].sort(
      sortImportsByFilename,
    ),
    { blankLinesBetweenStatements: false },
  )

  const content = createTSContent([createGQLQuery(fixedQuery, request.variable), ...statements], {
    blankLinesBetweenStatements: true,
  })

  return format([imports, content].join('\n\n'), options.prettierOptions)
}
