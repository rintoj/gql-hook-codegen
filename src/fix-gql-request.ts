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

function addVariable(context: Context, variable: gql.InputValueDefinitionNode) {
  const variableNames = context.variables.map(item => item.name.value)
  const from = variable.name.value
  const to = variableNames.includes(from)
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

function parseSelection(
  selectionSet: gql.SelectionNode,
  objectDef: gql.ObjectTypeDefinitionNode,
  context: Context,
) {
  if (selectionSet.kind === gql.Kind.FIELD) {
    const queryName = selectionSet.name.value
    const targetField = findField(objectDef, queryName)
    const type = findDeepType(targetField.type)
    const scalar = isScalarType(type)
    if (!scalar && selectionSet.selectionSet) {
      const objectType = findObjectType(context.schema, type)
      const newContext = { ...context, path: [...context.path, queryName] }
      const variableMap = targetField?.arguments?.map(variable => addVariable(newContext, variable))
      return {
        ...selectionSet,
        arguments: targetField?.arguments?.map(variable =>
          inputValueDefToVariable(variable, variableMap),
        ),
        selectionSet: parseSelectionSet(selectionSet.selectionSet, objectType, newContext),
      }
    }
    const variableMap = targetField?.arguments?.map(variable => addVariable(context, variable))
    return {
      ...selectionSet,
      arguments: targetField?.arguments?.map(variable =>
        inputValueDefToVariable(variable, variableMap),
      ),
    }
  }
  return selectionSet
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
