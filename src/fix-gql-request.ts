import * as gql from 'graphql'
import { DocumentNode } from 'graphql'
import {
  findField,
  findOperation,
  inputValueDefToVariable,
  inputValueDefToVariableDef,
} from './graphql-util'

export function fixGQLRequest(schema: DocumentNode, query: string) {
  let args: gql.InputValueDefinitionNode[] = []
  const newQuery = gql.parse(query).definitions.map(def => {
    if (def.kind === gql.Kind.OPERATION_DEFINITION) {
      const type = def.operation
      const selections = def.selectionSet.selections.map(selectionSet => {
        if (selectionSet.kind === gql.Kind.FIELD) {
          const queryName = selectionSet.name.value
          const operationDef = findOperation(schema, type)
          const targetField = findField(operationDef, queryName)
          args = [...args, ...(targetField?.arguments ?? [])]
          return {
            ...selectionSet,
            arguments: targetField?.arguments?.map(inputValueDefToVariable),
          }
        }
        return selectionSet
      })
      return {
        ...def,
        selectionSet: { ...def.selectionSet, selections },
        variableDefinitions: args.map(inputValueDefToVariableDef),
      }
    }
    return def
  })
  return newQuery.map(q => gql.print(q)).join('\n')
}
