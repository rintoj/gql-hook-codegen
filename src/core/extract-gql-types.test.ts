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
        type: 'INTERFACE',
        path: ['variables'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            schemaType: 'ID',
            isNonNull: true,
          },
        ],
      },
      {
        name: 'QueryType',
        type: 'INTERFACE',
        path: ['query'],
        fields: [
          {
            name: 'user',
            type: 'UserType',
            schemaType: 'User',
          },
        ],
      },
      {
        name: 'UserType',
        type: 'INTERFACE',
        path: ['query', 'user'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            schemaType: 'ID',
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
        type: 'INTERFACE',
        path: ['variables'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            schemaType: 'ID',
            isNonNull: true,
          },
          {
            name: 'limit',
            type: 'Int',
            schemaType: 'Int',
          },
        ],
      },
      {
        name: 'QueryType',
        type: 'INTERFACE',
        path: ['query'],
        fields: [
          {
            name: 'user',
            type: 'UserType',
            schemaType: 'User',
          },
        ],
      },
      {
        name: 'UserType',
        type: 'INTERFACE',
        path: ['query', 'user'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            schemaType: 'ID',
            isNonNull: true,
          },
          {
            name: 'followers',
            type: 'FollowersUserType',
            schemaType: 'User',
            isArray: true,
            isNonNull: true,
          },
        ],
      },
      {
        name: 'FollowersUserType',
        type: 'INTERFACE',
        path: ['query', 'user', 'followers'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            schemaType: 'ID',
            isNonNull: true,
          },
          {
            name: 'name',
            type: 'String',
            schemaType: 'String',
          },
        ],
      },
    ])
  })

  test('should extract mutation input types', () => {
    const request: any = parseSchema(`
      mutation ($input: RegisterUserInput!) {
        registerUser(id: $id) {
          id
          name
        }
      }
    `)
    const types = extractGQLTypes(schema, request.definitions[0])
    expect(types).toEqual([
      {
        name: 'RequestType',
        type: 'INTERFACE',
        path: ['variables'],
        fields: [
          {
            name: 'input',
            type: 'RegisterUserInputType',
            schemaType: 'RegisterUserInput',
            isNonNull: true,
          },
        ],
      },
      {
        name: 'RegisterUserInputType',
        type: 'INTERFACE',
        path: ['variables', 'input'],
        fields: [
          {
            name: 'name',
            type: 'String',
            schemaType: 'String',
            isNonNull: true,
          },
          {
            name: 'email',
            type: 'String',
            schemaType: 'String',
            isNonNull: true,
          },
        ],
      },
      {
        name: 'MutationType',
        type: 'INTERFACE',
        path: ['mutation'],
        fields: [
          {
            name: 'registerUser',
            type: 'UserType',
            schemaType: 'User',
            isNonNull: true,
          },
        ],
      },
      {
        name: 'UserType',
        type: 'INTERFACE',
        path: ['mutation', 'registerUser'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            schemaType: 'ID',
            isNonNull: true,
          },
          {
            name: 'name',
            type: 'String',
            schemaType: 'String',
          },
        ],
      },
    ])
  })

  test('should extract enum types', () => {
    const request: any = parseSchema(`
      mutation ($id: ID!, $status: UserStatus!) {
        setUserStatus(id: $id, status: $status) {
          id
          status
        }
      }
    `)
    const types = extractGQLTypes(schema, request.definitions[0])
    expect(types).toEqual([
      {
        name: 'RequestType',
        type: 'INTERFACE',
        path: ['variables'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            schemaType: 'ID',
            isNonNull: true,
          },
          {
            name: 'status',
            type: 'UserStatus',
            schemaType: 'UserStatus',
            isNonNull: true,
          },
        ],
      },
      {
        name: 'UserStatus',
        type: 'ENUM',
        path: ['mutation', 'setUserStatus', 'status'],
        fields: [
          {
            name: 'ACTIVE',
            type: 'ACTIVE',
            schemaType: 'ACTIVE',
          },
          {
            name: 'INACTIVE',
            type: 'INACTIVE',
            schemaType: 'INACTIVE',
          },
        ],
      },
      {
        name: 'MutationType',
        type: 'INTERFACE',
        path: ['mutation'],
        fields: [
          {
            name: 'setUserStatus',
            type: 'UserType',
            schemaType: 'User',
            isNonNull: true,
          },
        ],
      },
      {
        name: 'UserType',
        type: 'INTERFACE',
        path: ['mutation', 'setUserStatus'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            schemaType: 'ID',
            isNonNull: true,
          },
          {
            name: 'status',
            type: 'UserStatus',
            schemaType: 'UserStatus',
          },
        ],
      },
    ])
  })

  test('should extract scalar types', () => {
    const request: any = parseSchema(`
      query fetchUser ($id: ID!) {
        user(id: $id) {
          id
          createdAt
        }
      }
    `)
    const types = extractGQLTypes(schema, request.definitions[0])
    expect(types).toEqual([
      {
        name: 'RequestType',
        type: 'INTERFACE',
        path: ['variables'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            schemaType: 'ID',
            isNonNull: true,
          },
        ],
      },
      {
        name: 'QueryType',
        type: 'INTERFACE',
        path: ['query'],
        fields: [
          {
            name: 'user',
            type: 'UserType',
            schemaType: 'User',
          },
        ],
      },
      {
        name: 'UserType',
        type: 'INTERFACE',
        path: ['query', 'user'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            schemaType: 'ID',
            isNonNull: true,
          },
          {
            name: 'createdAt',
            type: 'DateTime',
            schemaType: 'DateTime',
          },
        ],
      },
      {
        name: 'DateTime',
        type: 'SCALAR',
        path: ['query', 'user', 'createdAt'],
        fields: [],
      },
    ])
  })

  test('should extract types from multiple queries', () => {
    const request: any = parseSchema(`
      query ($tweetId: ID!, $userId: ID!) {
        tweet(tweetId: $tweetId) {
          id
          author {
            id
            name
          }
        }
        user(id: $userId) {
          id
          name
        }
      }
    `)
    const types = extractGQLTypes(schema, request.definitions[0])
    expect(types).toEqual([
      {
        name: 'RequestType',
        type: 'INTERFACE',
        path: ['variables'],
        fields: [
          {
            name: 'tweetId',
            type: 'ID',
            schemaType: 'ID',
            isNonNull: true,
          },
          {
            name: 'userId',
            type: 'ID',
            schemaType: 'ID',
            isNonNull: true,
          },
        ],
      },
      {
        name: 'QueryType',
        type: 'INTERFACE',
        path: ['query'],
        fields: [
          {
            name: 'tweet',
            type: 'TweetType',
            schemaType: 'Tweet',
          },
          {
            name: 'user',
            type: 'UserType',
            schemaType: 'User',
          },
        ],
      },
      {
        name: 'TweetType',
        type: 'INTERFACE',
        path: ['query', 'tweet'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            schemaType: 'ID',
            isNonNull: true,
          },
          {
            name: 'author',
            type: 'UserType',
            schemaType: 'User',
            isNonNull: true,
          },
        ],
      },
      {
        name: 'UserType',
        type: 'INTERFACE',
        path: ['query', 'user'],
        fields: [
          {
            name: 'id',
            type: 'ID',
            schemaType: 'ID',
            isNonNull: true,
          },
          {
            name: 'name',
            type: 'String',
            schemaType: 'String',
          },
        ],
      },
    ])
  })

  test('should throw an error if an invalid query is used in the request', () => {
    const request: any = parseSchema(`
      query ($tweetId: ID!, $userId: ID!) {
        invalid(tweetId: $tweetId) {
          id
        }
      }
    `)
    expect(() => extractGQLTypes(schema, request.definitions[0])).toThrowError(
      'Invalid field: "query.invalid" - no such field exists in "type Query"',
    )
  })

  test('should throw an error if an invalid field is used in the request', () => {
    const request: any = parseSchema(`
      query ($tweetId: ID!, $userId: ID!) {
        user(tweetId: $tweetId) {
          invalid
        }
      }
    `)
    expect(() => extractGQLTypes(schema, request.definitions[0])).toThrowError(
      'Invalid field: "query.user.invalid" - no such field exists in "type User"',
    )
  })
})
