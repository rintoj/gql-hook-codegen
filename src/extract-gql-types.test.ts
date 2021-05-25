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
        name: 'RequestType',
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
        name: 'QueryType',
        path: ['query'],
        fields: [
          {
            name: 'user',
            type: 'UserType',
          },
        ],
      },
      {
        name: 'UserType',
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

  test('should extract complex types', () => {
    const request: any = parseSchema(`
      query ($id: ID!, $limit: Int) {
        user(id: $id) {
          id
          followers(limit: $limit) {
            id
            name
          }
        }
      }
    `)
    const types = extractGQLTypes(schema, request.definitions[0])
    expect(types).toEqual([
      {
        name: 'RequestType',
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
        name: 'QueryType',
        path: ['query'],
        fields: [
          {
            name: 'user',
            type: 'UserType',
          },
        ],
      },
      {
        name: 'UserType',
        path: ['query', 'user'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            isNonNull: true,
          },
          {
            name: 'followers',
            type: 'FollowersUserType',
            isArray: true,
            isNonNull: true,
          },
        ],
      },
      {
        name: 'FollowersUserType',
        path: ['query', 'user', 'followers'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            isNonNull: true,
          },
          {
            name: 'name',
            type: 'String',
          },
        ],
      },
    ])
  })
})
