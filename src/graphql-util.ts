import { DocumentNode } from 'graphql'
import { readFileSync } from 'fs-extra'
import * as gql from 'graphql'
import { toClassName } from 'name-util'
import { required } from './util'

export type OperationType = 'query' | 'mutation' | 'subscription'

export function parseSchema(content: string) {
  return gql.parse(content)
}

export function loadSchema(file: string) {
  const content = readFileSync(file, 'utf8')
  return parseSchema(content)
}

export function findOperation(schema: DocumentNode, type: OperationType) {
  const def = schema.definitions.find(
    def => def.kind === gql.Kind.OBJECT_TYPE_DEFINITION && def.name.value === toClassName(type),
  ) as gql.ObjectTypeDefinitionNode
  return required(def, `Count not found "type ${toClassName(type)}" in your schema`)
}

export function findField(def: gql.ObjectTypeDefinitionNode, name: string) {
  const field = def.fields?.find(
    def => def.kind === gql.Kind.FIELD_DEFINITION && def.name.value === name,
  )
  return required(field, `No such field: ${name}`)
}

export function inputValueDefToVariableDef(
  input: gql.InputValueDefinitionNode,
): gql.VariableDefinitionNode {
  return {
    kind: gql.Kind.VARIABLE_DEFINITION,
    variable: {
      kind: gql.Kind.VARIABLE,
      name: input.name,
    },
    type: input.type,
    defaultValue: input.defaultValue,
    directives: input.directives,
  }
}

export function inputValueDefToVariable(input: gql.InputValueDefinitionNode): gql.ArgumentNode {
  return {
    kind: gql.Kind.ARGUMENT,
    name: input.name,
    value: {
      kind: gql.Kind.VARIABLE,
      name: input.name,
    },
  }
}
