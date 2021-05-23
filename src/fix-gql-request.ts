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
  const variableNames = context.variables.map(item => item.name.value)
  const names = existingArguments.map(item => item.name.value)
  const from = variable.name.value
  const to = names.includes(from)
    ? (existingArguments?.find(item => item.name.value === from) as any)?.value?.name.value
    : variableNames.includes(from)
    ? toCamelCase([...context.path, from].join('-'))
    : variable.name.value
  context.variables.push({
    ...variable,
    name: {
      ...variable.name,
      value: to,
    },
  })
  return { from, to }
}

function composeArgumentList(
  inputValue: ReadonlyArray<gql.InputValueDefinitionNode>,
  existingArguments: ReadonlyArray<gql.ArgumentNode>,
  variableMap: Array<{ from: string; to: string }> = [],
) {
  const names = existingArguments.map(item => item.name.value)
  return inputValue.map(input => {
    if (names.includes(input.name.value)) {
      return existingArguments.find(
        item => item.name.value === input.name.value,
      ) as gql.ArgumentNode
    }
    return inputValueDefToVariable(input, variableMap)
  })
}

function parseSelection(
  selection: gql.SelectionNode,
  objectDef: gql.ObjectTypeDefinitionNode,
  context: Context,
) {
  if (selection.kind === gql.Kind.FIELD) {
    const queryName = selection.name.value
    const targetField = findField(objectDef, queryName)
    const type = findDeepType(targetField.type)
    const scalar = isScalarType(type)
    const objectType = !scalar ? findObjectType(context.schema, type) : undefined
    const targetContext = !scalar ? { ...context, path: [...context.path, queryName] } : context
    const variableMap = targetField?.arguments?.map(variable =>
      addVariable(targetContext, selection.arguments ?? [], variable),
    )
    const argumentList = composeArgumentList(
      targetField.arguments ?? [],
      selection.arguments ?? [],
      variableMap,
    )
    const selectionSet =
      !scalar && selection.selectionSet && objectType
        ? parseSelectionSet(selection.selectionSet, objectType, targetContext)
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
