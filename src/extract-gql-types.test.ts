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
        type: 'INTERFACE',
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
        type: 'INTERFACE',
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
        type: 'INTERFACE',
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
            isNonNull: true,
          },
          {
            name: 'email',
            type: 'String',
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
            isNonNull: true,
          },
          {
            name: 'status',
            type: 'UserStatus',
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
          },
          {
            name: 'INACTIVE',
            type: 'INACTIVE',
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
            isNonNull: true,
          },
          {
            name: 'status',
            type: 'UserStatus',
          },
        ],
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
            isNonNull: true,
          },
          {
            name: 'userId',
            type: 'ID',
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
          },
          {
            name: 'user',
            type: 'UserType',
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
            isNonNull: true,
          },
          {
            name: 'author',
            type: 'UserType',
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
