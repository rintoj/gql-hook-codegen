import { extractGQLTypes } from './extract-gql-types'
import { loadSchema, parseSchema } from './graphql-util'

const schema = loadSchema('test/schema.gql')

describe('extractGQLTypes', () => {
  test('should extract types', () => {
    const request: any = parseSchema(`
      query ($id: ID!) {
        user(id: $id) {
          id
        }
      }
    `)
    const types = extractGQLTypes(schema, request.definitions[0])
    expect(types).toEqual([
      {
        name: 'Request',
        path: ['variables'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            isNonNull: true,
          },
        ],
      },
      {
        name: 'Query',
        path: ['query'],
        fields: [
          {
            name: 'user',
            type: 'User',
          },
        ],
      },
      {
        name: 'User',
        path: ['query', 'user'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            isNonNull: true,
          },
        ],
      },
    ])
  })

  test('should extract types', () => {
    const request: any = parseSchema(`
      query ($id: ID!, $limit: Int) {
        user(id: $id) {
          id
          followers(limit: $limit) {
            name
          }
        }
      }
    `)
    const types = extractGQLTypes(schema, request.definitions[0])
    expect(types).toEqual([
      {
        name: 'Request',
        path: ['variables'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            isNonNull: true,
          },
          {
            name: 'limit',
            type: 'Int',
          },
        ],
      },
      {
        name: 'Query',
        path: ['query'],
        fields: [
          {
            name: 'user',
            type: 'User',
          },
        ],
      },
      {
        name: 'User',
        path: ['query', 'user'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            isNonNull: true,
          },
          {
            name: 'followers',
            type: 'User',
            isArray: true,
            isNonNull: true,
          },
        ],
      },
      {
        name: 'User',
        path: ['query', 'user', 'followers'],
        fields: [
          {
            name: 'name',
            type: 'String',
          },
        ],
      },
    ])
  })
})
