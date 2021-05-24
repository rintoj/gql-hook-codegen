import { fixGQLRequest } from './fix-gql-request'
import { loadSchema } from './graphql-util'
import { trimPadding } from './util'

const schema = loadSchema('test/schema.gql')

describe('fixGQLRequest', () => {
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
    expect(trimPadding(fixedQuery)).toEqual(
      trimPadding(`
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
    expect(trimPadding(fixedQuery)).toEqual(
      trimPadding(`
        query ($id: ID!, $limit: Int) {
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
    expect(trimPadding(fixedQuery)).toEqual(
      trimPadding(`
        query ($id: ID!, $limit: Int) {
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
    expect(trimPadding(fixedQuery)).toEqual(
      trimPadding(`
        query ($id: ID!, $limit: Int, $userFollowersFollowersLimit: Int) {
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
    expect(trimPadding(fixedQuery)).toEqual(
      trimPadding(`
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

  test('should fix more than one argument for 3 level query with variables with same name', () => {
    const query = `
      query {
        user {
          name
          follower {
            id
            name
            follower {
              id
              name
            }
          }
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(trimPadding(fixedQuery)).toEqual(
      trimPadding(`
        query ($id: ID!, $userFollowerId: ID!, $userFollowerFollowerId: ID!) {
          user(id: $id) {
            name
            follower(id: $userFollowerId) {
              id
              name
              follower(id: $userFollowerFollowerId) {
                id
                name
              }
            }
          }
        }
      `),
    )
  })

  test('should fix batched query', () => {
    const query = `
      query {
        user {
          name
        }
        followers {
          id
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(trimPadding(fixedQuery)).toEqual(
      trimPadding(`
        query ($id: ID!, $followersId: ID!, $limit: Int) {
          user(id: $id) {
            name
          }
          followers(id: $followersId, limit: $limit) {
            id
          }
        }
      `),
    )
  })

  test('should reuse existing variable names', () => {
    const query = `
      query ($userId: ID!, $followersId: ID!) {
        user(id: $userId) {
          name
        }
        followers(id: $followersId) {
          id
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(trimPadding(fixedQuery)).toEqual(
      trimPadding(`
        query ($userId: ID!, $followersId: ID!, $limit: Int) {
          user(id: $userId) {
            name
          }
          followers(id: $followersId, limit: $limit) {
            id
          }
        }
      `),
    )
  })

  test('should throw an error if invalid selector is used in a query', () => {
    const query = `
      query {
        user {
          id
          name
          invalid
        }
      }
    `
    expect(() => fixGQLRequest(schema, query)).toThrowError()
  })

  test('should throw an error if invalid selector is used in a mutation', () => {
    const query = `
      mutation {
        registerUser {
          id
          name
          invalid
        }
      }
    `
    expect(() => fixGQLRequest(schema, query)).toThrow()
  })

  test('should throw an error if invalid selector is used in a subscription', () => {
    const query = `
      subscription {
        onUserChange {
          id
          name
          invalid
        }
      }
    `
    expect(() => fixGQLRequest(schema, query)).toThrowError()
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
    expect(trimPadding(fixedQuery)).toEqual(
      trimPadding(`
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
        onUserChange {
          id
          name
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(trimPadding(fixedQuery)).toEqual(
      trimPadding(`
        subscription ($id: ID!) {
          onUserChange(id: $id) {
            id
            name
          }
        }
      `),
    )
  })
})
