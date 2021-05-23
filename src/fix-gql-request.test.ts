import { fixGQLRequest } from './fix-gql-request'
import { loadSchema } from './graphql-util'

function format(content: string) {
  return content
    .split('\n')
    .map(i => i.trim())
    .filter(i => i !== '')
}

const schema = loadSchema('test/schema.gql')

describe('fixGQLRequestArguments', () => {
  test('should fix argument for a simple query', () => {
    const query = `
      query {
        user {
          id
          name
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(format(fixedQuery)).toEqual(
      format(`
        query ($id: ID!) {
          user(id: $id) {
            id
            name
          }
        }
      `),
    )
  })

  test('should fix more than one argument for a simple query', () => {
    const query = `
      query {
        followers {
          id
          name
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(format(fixedQuery)).toEqual(
      format(`
        query ($id: ID!, $limit: Number) {
          followers(id: $id, limit: $limit) {
            id
            name
          }
        }
      `),
    )
  })

  test('should fix more than one argument for a complex query', () => {
    const query = `
      query {
        user {
          name
          followers {
            id
            name
          }
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(format(fixedQuery)).toEqual(
      format(`
        query ($id: ID!, $limit: Number) {
          user(id: $id) {
            name
            followers(limit: $limit) {
              id
              name
            }
          }
        }
      `),
    )
  })

  test('should fix more than one argument for a complex query with 3 level deep', () => {
    const query = `
      query {
        user {
          name
          followers {
            id
            name
            followers {
              id
              name
            }
          }
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(format(fixedQuery)).toEqual(
      format(`
        query ($id: ID!, $limit: Number, $userFollowersFollowersLimit: Number) {
          user(id: $id) {
            name
            followers(limit: $limit) {
              id
              name
              followers(limit: $userFollowersFollowersLimit) {
                id
                name
              }
            }
          }
        }
      `),
    )
  })

  test('should fix more than one argument for a complex query with variables with same name', () => {
    const query = `
      query {
        user {
          name
          follower {
            id
            name
          }
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(format(fixedQuery)).toEqual(
      format(`
        query ($id: ID!, $userFollowerId: ID!) {
          user(id: $id) {
            name
            follower(id: $userFollowerId) {
              id
              name
            }
          }
        }
      `),
    )
  })

  test('should fix argument for a simple mutation', () => {
    const query = `
      mutation {
        registerUser {
          id
          name
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(format(fixedQuery)).toEqual(
      format(`
        mutation ($input: RegisterUserInput!) {
          registerUser(input: $input) {
            id
            name
          }
        }
      `),
    )
  })

  test('should fix argument for a simple subscription', () => {
    const query = `
      subscription {
        onUpdateUser {
          id
          name
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(format(fixedQuery)).toEqual(
      format(`
        subscription ($id: ID!) {
          onUpdateUser(id: $id) {
            id
            name
          }
        }
      `),
    )
  })
})
