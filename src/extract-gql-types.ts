import * as gql from 'graphql'
import { toClassName } from 'name-util'
import { findDeepType, findField, findObjectType, isScalarType } from './graphql-util'
import { md5Hex } from './util'

interface Field {
  name: string
  type: string
  isNonNull?: boolean
  isArray?: boolean
}

interface Type {
  name: string
  path: string[]
  fields: Field[]
}

interface Context {
  schema: gql.DocumentNode
  path: string[]
}

export function toId(item: Type) {
  return md5Hex([item.name, ...Array.from(new Set(item.fields)).sort()].join(':'))
}

function parseFieldAttributes(def: gql.TypeNode): Omit<Field, 'name'> {
  if (def.kind === 'NamedType') {
    return { type: def.name.value }
  } else if (def.kind === 'NonNullType') {
    return { ...parseFieldAttributes(def.type), isNonNull: true }
  } else if (def.kind === 'ListType') {
    return { ...parseFieldAttributes(def.type), isArray: true }
  }
  throw new Error('Invalid TypeNode!')
}

function extractFieldInfo(name: string, field: gql.FieldDefinitionNode) {
  return { name, ...parseFieldAttributes(field.type) }
}

function mapEachField<T>(
  selectionSet: gql.SelectionSetNode | undefined,
  caller: (selection: gql.FieldNode, index: number) => T,
) {
  return (
    selectionSet?.selections.map((selection, index): T => {
      if (selection.kind !== gql.Kind.FIELD) {
        throw new Error(`Invalid selection type: ${selection.kind}`)
      }
      return caller(selection, index)
    }) ?? []
  )
}

function findTargetField(
  objectDef: gql.ObjectTypeDefinitionNode,
  fieldName: string,
  context: Context,
) {
  const targetField = findField(objectDef, fieldName)
  if (!targetField) {
    throw new Error(`Invalid field: "${[context.path, fieldName].join('.')}"`)
  }
  return targetField
}

function extractTypeInfo(
  name: string,
  selectionSet: gql.SelectionSetNode | undefined,
  objectDef: gql.ObjectTypeDefinitionNode,
  context: Context,
) {
  return {
    name,
    path: context.path,
    fields:
      mapEachField(selectionSet, (selection): Field => {
        const targetField = findField(objectDef, selection.name.value) as gql.FieldDefinitionNode
        return extractFieldInfo(selection.name.value, targetField)
      }) ?? [],
  }
}

function parseSelection(
  objectDef: gql.ObjectTypeDefinitionNode,
  selection: gql.SelectionNode,
  context: Context,
): Type[] {
  if (selection.kind !== gql.Kind.FIELD) {
    throw new Error(`Invalid field: "${[context.path, selection.kind].join('.')}"`)
  }
  const fieldName = selection.name.value
  const targetField = findTargetField(objectDef, fieldName, context)
  const type = findDeepType(targetField.type)
  const scalar = isScalarType(type)
  if (!scalar && selection.selectionSet) {
    return extractTypes(type, selection.selectionSet, {
      ...context,
      path: [...context.path, fieldName],
    })
  }
  return []
}

function extractTypes(type: string, selectionSet: gql.SelectionSetNode, context: Context) {
  let output: Type[] = []
  const objectDef = findObjectType(context.schema, toClassName(type))
  output.push(extractTypeInfo(toClassName(type), selectionSet, objectDef, context))
  mapEachField(selectionSet, selection => {
    output = [...output, ...parseSelection(objectDef, selection, context)]
  })
  return output
}

function extractRequestType(def: gql.OperationDefinitionNode, context: Context): Type[] {
  let output: Type[] = []
  const fields =
    def.variableDefinitions?.map(
      (vDef: gql.VariableDefinitionNode): Field => ({
        name: vDef.variable.name.value,
        ...parseFieldAttributes(vDef.type),
      }),
    ) ?? []
  output.push({
    name: 'Request',
    path: context.path,
    fields,
  })
  def.variableDefinitions?.forEach((vDef: gql.VariableDefinitionNode) => {
    const type = findDeepType(vDef.type)
    const scalar = isScalarType(type)
    if (!scalar) {
      output = [...output, ...extractTypes(type, {} as any, context)]
    }
  })
  return output
}

export function extractGQLTypes(
  schema: gql.DocumentNode,
  def: gql.OperationDefinitionNode,
): Type[] {
  const context = { schema, path: [] }
  if (def.kind === gql.Kind.OPERATION_DEFINITION) {
    return [
      ...extractRequestType(def, {
        ...context,
        path: [...context.path, 'variables'],
      }),
      ...extractTypes(def.operation, def.selectionSet, {
        ...context,
        path: [...context.path, def.operation],
      }),
    ]
  }
  return []
}
