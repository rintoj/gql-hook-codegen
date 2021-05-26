import * as gql from 'graphql'
import { DocumentNode } from 'graphql'
import { toCamelCase, toClassName } from 'name-util'
import {
  findField,
  findDeepType,
  findObjectType,
  inputValueDefToVariable,
  inputValueDefToVariableDef,
  isScalarType,
  findSchemaType,
} from './graphql-util'

interface Context {
  schema: DocumentNode
  path: string[]
  variables: gql.InputValueDefinitionNode[]
}

function addVariable(
  context: Context,
  existingArguments: ReadonlyArray<gql.ArgumentNode>,
  variable: gql.InputValueDefinitionNode,
) {
  const from = variable.name.value
  const variableNames = context.variables.map(item => item.name.value)
  const existingArg = existingArguments.find(item => item.name.value === from)
  const to = existingArg
    ? (existingArg as any)?.value?.name.value
    : variableNames.includes(from)
    ? toCamelCase([...context.path, from].join('-'))
    : variable.name.value
  context.variables.push({ ...variable, name: { ...variable.name, value: to } })
  return { from, to }
}

function composeArgumentList(
  inputValues: ReadonlyArray<gql.InputValueDefinitionNode>,
  argumentNodes: ReadonlyArray<gql.ArgumentNode>,
  variableMap: Array<{ from: string; to: string }> = [],
) {
  return inputValues.map(input => {
    const argumentNode = argumentNodes.find(item => item.name.value === input.name.value)
    if (argumentNode) {
      return argumentNode
    }
    return inputValueDefToVariable(input, variableMap)
  })
}

function deduplicateVariables(
  inputValues: ReadonlyArray<gql.InputValueDefinitionNode>,
  argumentNodes: ReadonlyArray<gql.ArgumentNode>,
  context: Context,
) {
  return inputValues?.map(variable => addVariable(context, argumentNodes ?? [], variable))
}

function parseSelection(
  selection: gql.SelectionNode,
  objectDef: gql.ObjectTypeDefinitionNode,
  initialContext: Context,
) {
  if (selection.kind === gql.Kind.FIELD) {
    const queryName = selection.name.value
    const targetField = findField(objectDef, queryName)
    if (!targetField) {
      throw new Error(`Invalid field: "${[initialContext.path, queryName].join('.')}"`)
    }
    const type = findDeepType(targetField.type)
    const scalar = isScalarType(type)
    const objectType = !scalar ? findSchemaType(initialContext.schema, type) : undefined
    const context = !scalar
      ? { ...initialContext, path: [...initialContext.path, queryName] }
      : initialContext
    const variableMap = deduplicateVariables(
      targetField.arguments ?? [],
      selection.arguments ?? [],
      context,
    )
    const argumentList = composeArgumentList(
      targetField.arguments ?? [],
      selection.arguments ?? [],
      variableMap,
    )
    const selectionSet =
      selection.selectionSet && objectType?.kind === gql.Kind.OBJECT_TYPE_DEFINITION
        ? parseSelectionSet(selection.selectionSet, objectType, context)
        : undefined
    return {
      ...selection,
      arguments: argumentList,
      selectionSet,
    }
  }
  return selection
}

function parseSelectionSet(
  selectionSet: gql.SelectionSetNode,
  operationDef: gql.ObjectTypeDefinitionNode,
  context: Context,
): gql.SelectionSetNode {
  const selections = selectionSet.selections.map(field =>
    parseSelection(field, operationDef, context),
  )
  return { ...selectionSet, selections }
}

function parseOperationDef(schema: DocumentNode, def: gql.DefinitionNode) {
  if (def.kind === gql.Kind.OPERATION_DEFINITION) {
    const type = def.operation
    const context = { schema, path: [], variables: [] }
    const operationDef = findObjectType(schema, toClassName(type))
    return {
      ...def,
      selectionSet: parseSelectionSet(def.selectionSet, operationDef, context),
      variableDefinitions: context.variables.map(inputValueDefToVariableDef),
    }
  }
  return def
}

export function fixGQLRequest(schema: DocumentNode, query: string) {
  const newQuery = gql.parse(query).definitions.map(def => parseOperationDef(schema, def))
  return newQuery.map(q => gql.print(q)).join('\n')
}