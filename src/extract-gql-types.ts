import * as gql from 'graphql'
import { toClassName } from 'name-util'
import { findField as findNullableField, findObjectType, isScalarType } from './graphql-util'
import { ById, md5Hex } from './util'

interface GQLField {
  name: string
  type: string | GQLType
  isNonNull?: boolean
  isArray?: boolean
}

interface GQLType {
  id?: string
  name: string
  path: string[]
  fields: GQLField[]
}

interface Context {
  schema: gql.DocumentNode
  path: string[]
}

interface DeduplicateContext {
  types: ById<{ name: string; id: string }>
}

function generateGQLTypeId(item: GQLType) {
  return md5Hex([item.name, '<>', ...Array.from(new Set(item.fields)).sort()].join(':'))
}

function nextContext(context: Context, path: string) {
  return { ...context, path: [...context.path, path] }
}

function findField(objectDef: gql.ObjectTypeDefinitionNode, fieldName: string, context: Context) {
  const nullableField = findNullableField(objectDef, fieldName)
  if (!nullableField) {
    throw new Error(`Invalid field: "${[context.path, fieldName].join('.')}"`)
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
    if (!isScalarType(typeDef.name.value) && selectionSet) {
      const type = extractGQLType(typeDef.name.value, selectionSet, context)
      return { name, type }
    }
    return { name, type: typeDef.name.value }
  } else if (typeDef.kind === 'NonNullType') {
    return { ...extractGQLFieldType(name, typeDef.type, selectionSet, context), isNonNull: true }
  } else if (typeDef.kind === 'ListType') {
    return { ...extractGQLFieldType(name, typeDef.type, selectionSet, context), isArray: true }
  }
  throw new Error('Invalid TypeNode!')
}

function extractGQLField(
  field: gql.SelectionNode | gql.FieldDefinitionNode,
  parentObjectDef: gql.ObjectTypeDefinitionNode,
  context: Context,
): GQLField {
  if (field.kind !== gql.Kind.FIELD) {
    throw new Error('Invalid field!')
  }
  const fieldDef = findField(parentObjectDef, field.name.value, context)
  return extractGQLFieldType(
    field.name.value,
    fieldDef.type,
    field.selectionSet,
    nextContext(context, field.name.value),
  )
}

function extractGQLType(
  name: string,
  selectionSet: gql.SelectionSetNode | undefined,
  context: Context,
): GQLType {
  const objectDef = findObjectType(context.schema, toClassName(name))
  return {
    name: toClassName(`${name}-type`),
    path: context.path,
    fields: selectionSet
      ? selectionSet.selections.map(field => extractGQLField(field, objectDef, context))
      : objectDef.fields?.map(field => extractGQLField(field, objectDef, context)) ?? [],
  }
}

function extractRequestType(def: gql.OperationDefinitionNode, context: Context): GQLType {
  return {
    name: 'RequestType',
    path: context.path,
    fields:
      def.variableDefinitions?.map(variableDef =>
        extractGQLFieldType(variableDef.variable.name.value, variableDef.type, undefined, context),
      ) ?? [],
  }
}

function deduplicateGQLTypeName(gqlType: GQLType, context: DeduplicateContext) {
  const id = generateGQLTypeId(gqlType)
  if (context.types[id]) {
    return context.types[id].name
  }
  if (!context.types[gqlType.name]) {
    context.types[gqlType.name] = { name: gqlType.name, id }
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

function deduplicateGQLType(gqlType: GQLType, context: DeduplicateContext): GQLType[] {
  let gqlTypes: GQLType[] = []
  const name = deduplicateGQLTypeName(gqlType, context)
  const fields = gqlType.fields.map(field => {
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
      extractRequestType(def, nextContext(context, 'variables')),
      extractGQLType(def.operation, def.selectionSet, nextContext(context, def.operation)),
    ]
    return deduplicateGQLTypes(gqlTypes)
  }
  return []
}
