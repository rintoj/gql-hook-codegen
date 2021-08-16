import * as gql from 'graphql'
import { toClassName, toCamelCase } from 'name-util'
import { ById, md5Hex } from '../util/util'
import { findField as findNullableField, findSchemaType, isScalarType } from './graphql-util'

export interface GQLField {
  name: string
  type: string | GQLType
  schemaType: string
  isNonNull?: boolean
  isArray?: boolean
}

export enum GQLObjectType {
  INTERFACE = 'INTERFACE',
  ENUM = 'ENUM',
  SCALAR = 'SCALAR',
  UNION = 'UNION',
}

export interface GQLType {
  id?: string
  name: string
  originalName: string | null
  type: GQLObjectType
  path: string[]
  fields: GQLField[]
  types?: GQLType[]
}

interface Context {
  schema: gql.DocumentNode
  path: string[]
  isInput?: boolean
}

interface DeduplicateContext {
  types: ById<{ name: string; id: string }>
}

function generateGQLTypeId(item: GQLType) {
  return md5Hex(
    [item.name, '<>', ...Array.from(new Set(item.fields.map(({ name }) => name))).sort()].join(':'),
  )
}

function nextContext(context: Context, path: string) {
  return { ...context, path: [...context.path, path] }
}

function findField(
  objectDef: gql.ObjectTypeDefinitionNode | gql.InputObjectTypeDefinitionNode,
  fieldName: string,
  context: Context,
) {
  const nullableField = findNullableField(objectDef, fieldName)
  if (!nullableField) {
    throw new Error(
      `Invalid field: "${[...context.path, fieldName].join('.')}" - no such field exists in "${
        context.isInput ? 'input' : 'type'
      } ${objectDef.name.value}"`,
    )
  }
  return nullableField
}

function extractGQLFieldType(
  name: string,
  typeDef: gql.TypeNode,
  selectionSet: gql.SelectionSetNode | undefined,
  context: Context,
): GQLField {
  if (typeDef.kind === 'NamedType') {
    if (!isScalarType(typeDef.name.value)) {
      const type = extractGQLType(typeDef.name.value, selectionSet, context)
      return { name, type, schemaType: typeDef.name.value }
    }
    return { name, type: typeDef.name.value, schemaType: typeDef.name.value }
  } else if (typeDef.kind === 'NonNullType') {
    return { ...extractGQLFieldType(name, typeDef.type, selectionSet, context), isNonNull: true }
  } else if (typeDef.kind === 'ListType') {
    return { ...extractGQLFieldType(name, typeDef.type, selectionSet, context), isArray: true }
  }
  throw new Error('Invalid TypeNode!')
}

function extractGQLField(
  field: gql.SelectionNode | gql.FieldDefinitionNode | gql.InputValueDefinitionNode,
  parentObjectDef: gql.ObjectTypeDefinitionNode | gql.InputObjectTypeDefinitionNode,
  context: Context,
): GQLField {
  if (field.kind !== gql.Kind.FIELD && field.kind !== gql.Kind.INPUT_VALUE_DEFINITION) {
    throw new Error(`Invalid field type ${field.kind}!`)
  }
  const fieldDef = findField(parentObjectDef, field.name.value, context)
  return extractGQLFieldType(
    field.name.value,
    fieldDef.type,
    field.kind !== gql.Kind.INPUT_VALUE_DEFINITION ? field.selectionSet : undefined,
    nextContext(context, field.name.value),
  )
}

function extractEnumType(objectDef: gql.EnumTypeDefinitionNode, context: Context): GQLType {
  return {
    name: objectDef.name.value,
    originalName: null,
    type: GQLObjectType.ENUM,
    path: context.path,
    fields:
      objectDef.values?.map(
        (value): GQLField => ({
          name: value.name.value,
          type: value.name.value,
          schemaType: value.name.value,
        }),
      ) ?? [],
  }
}

function extractUnionType(
  objectDef: gql.UnionTypeDefinitionNode,
  selectionSet: gql.SelectionSetNode | undefined,
  context: Context,
): GQLType {
  const types = (selectionSet?.selections ?? []).map((type: gql.SelectionNode) => {
    if (type.kind !== gql.Kind.INLINE_FRAGMENT) {
      throw new Error(`Expecting an inline fragment in union type ${objectDef.name.value}!`)
    }
    const name = type.typeCondition?.name.value
    if (!name) {
      throw new Error('Invalid inline fragment - missing `typeCondition`!')
    }
    return extractGQLType(name, type.selectionSet, nextContext(context, toCamelCase(name)))
  })
  return {
    name: toClassName(`${objectDef.name.value}-type`),
    originalName: null,
    type: GQLObjectType.UNION,
    path: context.path,
    fields: [],
    types,
  }
}

function extractScalarType(objectDef: gql.ScalarTypeDefinitionNode, context: Context): GQLType {
  return {
    name: objectDef.name.value,
    originalName: null,
    type: GQLObjectType.SCALAR,
    path: context.path,
    fields: [],
  }
}

function extractGQLType(
  name: string,
  selectionSet: gql.SelectionSetNode | undefined,
  context: Context,
): GQLType {
  const def = findSchemaType(context.schema, toClassName(name))
  if (!def) {
    throw new Error(`Invalid type: "${name}" found at "${context.path.join('.')}"`)
  }
  if (def.kind === gql.Kind.ENUM_TYPE_DEFINITION) {
    return extractEnumType(def, context)
  }
  if (def.kind === gql.Kind.UNION_TYPE_DEFINITION) {
    return extractUnionType(def, selectionSet, context)
  }
  if (def.kind === gql.Kind.SCALAR_TYPE_DEFINITION) {
    return extractScalarType(def, context)
  }
  const fields = selectionSet
    ? selectionSet.selections.map(field => extractGQLField(field, def, context))
    : def.fields?.map((field: gql.FieldDefinitionNode | gql.InputValueDefinitionNode) =>
        extractGQLField(field, def, context),
      ) ?? []
  return {
    name: toClassName(`${name}-type`),
    originalName: ['query', 'mutation'].includes(name) ? null : toClassName(name),
    type: GQLObjectType.INTERFACE,
    path: context.path,
    fields,
  }
}

function extractInputType(def: gql.OperationDefinitionNode, context: Context): GQLType {
  const fields =
    def.variableDefinitions?.map(variableDef =>
      extractGQLFieldType(
        variableDef.variable.name.value,
        variableDef.type,
        undefined,
        nextContext(context, variableDef.variable.name.value),
      ),
    ) ?? []
  return {
    name: 'RequestType',
    originalName: null,
    type: GQLObjectType.INTERFACE,
    path: context.path,
    fields,
  }
}

function deduplicateGQLTypeName(gqlType: GQLType, context: DeduplicateContext) {
  const id = generateGQLTypeId(gqlType)
  if (context.types[id]) {
    return context.types[id].name
  }
  if (!context.types[gqlType.name]) {
    context.types[gqlType.name] = { name: gqlType.name, id }
    context.types[id] = { name: gqlType.name, id }
    return gqlType.name
  }
  const length = gqlType.path.length
  let name = gqlType.name
  let counter = 1
  let index = length - 1
  while (context.types[name] && counter <= 100) {
    if (index >= 0) {
      name = toClassName(`${gqlType.path.slice(index--).join('-')}${gqlType.name}`)
    } else {
      name = toClassName(`${gqlType.name}${counter++}`)
    }
  }
  const newId = generateGQLTypeId({ ...gqlType, name })
  context.types[name] = { name, id: newId }
  context.types[newId] = { name, id: newId }
  return name
}

function deduplicateUnionType(gqlType: GQLType, context: DeduplicateContext): GQLType[] {
  let gqlTypes: GQLType[] = []
  const fields = (gqlType.types ?? []).map(type => {
    const name = typeof type === 'string' ? type : type.name
    const schemaType = typeof type === 'string' ? type : (type.originalName as string)
    return {
      name: name,
      type: name,
      schemaType,
    }
  })
  gqlType.types?.map(type => {
    if (typeof type !== 'string') {
      const deduplicatedGQLTypes = deduplicateGQLType(type, context)
      gqlTypes = gqlTypes.concat(deduplicatedGQLTypes)
    }
  })
  return [
    {
      name: gqlType.name,
      originalName: null,
      type: GQLObjectType.UNION,
      path: gqlType.path,
      fields,
    },
    ...gqlTypes,
  ]
}

function deduplicateGQLType(gqlType: GQLType, context: DeduplicateContext): GQLType[] {
  const name = deduplicateGQLTypeName(gqlType, context)
  if (gqlType.type === GQLObjectType.UNION) {
    return deduplicateUnionType(gqlType, context)
  }
  let gqlTypes: GQLType[] = []
  const fields = gqlType.fields?.map(field => {
    if (typeof field.type !== 'string') {
      const deduplicatedGQLTypes = deduplicateGQLType(field.type, context)
      gqlTypes = gqlTypes.concat(deduplicatedGQLTypes)
      return { ...field, type: deduplicatedGQLTypes[0].name }
    }
    return field
  })
  return [{ ...gqlType, name, fields }, ...gqlTypes]
}

function deduplicateGQLTypes(gqlTypes: GQLType[], context: DeduplicateContext = { types: {} }) {
  const deduplicatedGQLTypes = gqlTypes.reduce(
    (a, dataType) => a.concat(deduplicateGQLType(dataType, context)),
    [] as GQLType[],
  )
  return Object.values(
    Object.fromEntries(deduplicatedGQLTypes.map(gqlType => [generateGQLTypeId(gqlType), gqlType])),
  )
}

export function extractGQLTypes(
  schema: gql.DocumentNode,
  def: gql.OperationDefinitionNode,
): GQLType[] {
  const context = { schema, path: [] }
  if (def.kind === gql.Kind.OPERATION_DEFINITION) {
    const gqlTypes = [
      extractInputType(def, nextContext({ ...context, isInput: true }, 'variables')),
      extractGQLType(def.operation, def.selectionSet, nextContext(context, def.operation)),
    ]
    return deduplicateGQLTypes(gqlTypes)
  }
  return []
}
