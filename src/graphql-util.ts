import { DocumentNode } from 'graphql'
import { readFileSync } from 'fs-extra'
import * as gql from 'graphql'
import { toClassName } from 'name-util'
import { required } from './util'

export enum ScalarToJSType {
  String = 'string',
  Boolean = 'boolean',
  Int = 'number',
  Float = 'number',
  ID = 'string',
}

export type OperationType = 'query' | 'mutation' | 'subscription'

export function parseSchema(content: string) {
  return gql.parse(content)
}

export function isScalarType(type: string) {
  return !!(ScalarToJSType as any)[type]
}

export function loadSchema(file: string) {
  const content = readFileSync(file, 'utf8')
  return parseSchema(content)
}

export function findObjectType(schema: DocumentNode, type: string) {
  const def = schema.definitions.find(
    def => def.kind === gql.Kind.OBJECT_TYPE_DEFINITION && def.name.value === type,
  ) as gql.ObjectTypeDefinitionNode
  return required(def, `Count not found "type ${toClassName(type)}" in your schema`)
}

export function findInputType(schema: DocumentNode, type: string) {
  const def = schema.definitions.find(
    def => def.kind === gql.Kind.INPUT_OBJECT_TYPE_DEFINITION && def.name.value === type,
  ) as gql.ObjectTypeDefinitionNode
  return required(def, `Count not found "input ${toClassName(type)}" in your schema`)
}

export function findEnumType(schema: DocumentNode, type: string) {
  return schema.definitions.find(
    def => def.kind === gql.Kind.ENUM_TYPE_DEFINITION && def.name.value === type,
  ) as gql.EnumTypeDefinitionNode | undefined
}

export function findSchemaType(schema: DocumentNode, type: string) {
  const kinds = [
    gql.Kind.OBJECT_TYPE_DEFINITION,
    gql.Kind.INPUT_OBJECT_TYPE_DEFINITION,
    gql.Kind.ENUM_TYPE_DEFINITION,
  ]
  return schema.definitions.find(
    (def: any) => kinds.includes(def.kind) && def.name.value === type,
  ) as
    | gql.ObjectTypeDefinitionNode
    | gql.InputObjectTypeDefinitionNode
    | gql.EnumTypeDefinitionNode
    | undefined
}

export function findField(
  def: gql.ObjectTypeDefinitionNode | gql.InputObjectTypeDefinitionNode,
  name: string,
) {
  return def.fields?.find(def => def.name.value === name)
}

export function findOperation(schema: DocumentNode) {
  const def = schema.definitions.find(def => def.kind === gql.Kind.OPERATION_DEFINITION)
  if (def) {
    return (def as gql.OperationDefinitionNode).operation
  }
}

export function findDeepType(def: gql.TypeNode): string {
  if (def.kind === 'NamedType') {
    return def.name.value
  } else if (def.kind === 'NonNullType') {
    return findDeepType(def.type)
  } else if (def.kind === 'ListType') {
    return findDeepType(def.type)
  }
  throw new Error('Invalid TypeNode!')
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

export function inputValueDefToVariable(
  input: gql.InputValueDefinitionNode,
  variableMap: Array<{ from: string; to: string }> = [],
): gql.ArgumentNode {
  const variableName =
    variableMap?.find(({ from }) => from === input.name.value)?.to ?? input.name.value
  return {
    kind: gql.Kind.ARGUMENT,
    name: input.name,
    value: {
      kind: gql.Kind.VARIABLE,
      name: {
        ...input.name,
        value: variableName,
      },
    },
  }
}
