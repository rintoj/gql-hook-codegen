import { findObjectType, loadSchema, parseSchema } from './graphql-util'

const schema = loadSchema('test/schema.gql')

describe('findOperation', () => {
  test('should return Query type from a schema', () => {
    const query = findObjectType(schema, 'Query')
    expect(query.name.value).toEqual('Query')
    expect(query.kind).toEqual('ObjectTypeDefinition')
  })
  test('should return Mutation type from a schema', () => {
    const query = findObjectType(schema, 'Mutation')
    expect(query.name.value).toEqual('Mutation')
    expect(query.kind).toEqual('ObjectTypeDefinition')
  })
  test('should return Subscription type from a schema', () => {
    const query = findObjectType(schema, 'Subscription')
    expect(query.name.value).toEqual('Subscription')
    expect(query.kind).toEqual('ObjectTypeDefinition')
  })
  test('should throw an error if type is not found in schema', () => {
    const invalidSchema = parseSchema(`
      type User {
        id: ID!
      }
    `)
    expect(() => findObjectType(invalidSchema, 'Query')).toThrowError(
      'Did not find a required value: Count not found "type Query" in your schema',
    )
  })
})
