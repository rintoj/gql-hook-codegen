import * as gql from 'graphql'
import { DocumentNode } from 'graphql'
import { toClassName } from 'name-util'
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
  variables: gql.InputValueDefinitionNode[]
}

function parseSelection(
  selectionSet: gql.SelectionNode,
  objectDef: gql.ObjectTypeDefinitionNode,
  context: Context,
) {
  if (selectionSet.kind === gql.Kind.FIELD) {
    const queryName = selectionSet.name.value
    const targetField = findField(objectDef, queryName)
    context.variables = [...context.variables, ...(targetField?.arguments ?? [])]
    const type = findDeepType(targetField.type)
    const scalar = isScalarType(type)
    if (!scalar && selectionSet.selectionSet) {
      const objectType = findObjectType(context.schema, type)
      return {
        ...selectionSet,
        arguments: targetField?.arguments?.map(inputValueDefToVariable),
        selectionSet: parseSelectionSet(selectionSet.selectionSet, objectType, context),
      }
    }
    return {
      ...selectionSet,
      arguments: targetField?.arguments?.map(inputValueDefToVariable),
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
    const context = { schema, variables: [] }
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
