import { trimPaddingAndEmptyLines } from '../util/util'
import { fixGQLRequest } from './fix-gql-request'
import { loadSchema } from './graphql-util'

const schema = loadSchema('test/schema.gql')

describe('fixGQLRequest', () => {
  test('should fix argument for a simple query', () => {
    const query = `
      query getUser{
        user {
          id
          name
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(trimPaddingAndEmptyLines(fixedQuery)).toEqual(
      trimPaddingAndEmptyLines(`
        query getUser($id: ID!) {
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
    expect(trimPaddingAndEmptyLines(fixedQuery)).toEqual(
      trimPaddingAndEmptyLines(`
        query fetchFollowers($id: ID!, $limit: Int) {
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
    expect(trimPaddingAndEmptyLines(fixedQuery)).toEqual(
      trimPaddingAndEmptyLines(`
        query fetchUser($id: ID!, $limit: Int) {
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
    expect(trimPaddingAndEmptyLines(fixedQuery)).toEqual(
      trimPaddingAndEmptyLines(`
        query fetchUser($id: ID!, $limit: Int, $userFollowersFollowersLimit: Int) {
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
    expect(trimPaddingAndEmptyLines(fixedQuery)).toEqual(
      trimPaddingAndEmptyLines(`
        query fetchUser($id: ID!, $userFollowerId: ID!) {
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
    expect(trimPaddingAndEmptyLines(fixedQuery)).toEqual(
      trimPaddingAndEmptyLines(`
        query fetchUser($id: ID!, $userFollowerId: ID!, $userFollowerFollowerId: ID!) {
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
    expect(trimPaddingAndEmptyLines(fixedQuery)).toEqual(
      trimPaddingAndEmptyLines(`
        query fetchUserAndFollowers($id: ID!, $followersId: ID!, $limit: Int) {
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
    expect(trimPaddingAndEmptyLines(fixedQuery)).toEqual(
      trimPaddingAndEmptyLines(`
        query fetchUserAndFollowers($userId: ID!, $followersId: ID!, $limit: Int) {
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

  test('should work with common variable', () => {
    const query = `
      query fetchTweet($size: ImageSize) {
        tweet {
          id
          author {
            id
            photo {
              url(size: $size)
            }
          }
          mentions {
            id
            photo {
              url(size: $size)
            }
          }
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(trimPaddingAndEmptyLines(fixedQuery)).toEqual(
      trimPaddingAndEmptyLines(`
        query fetchTweet($id: ID!, $size: ImageSize) {
          tweet(id: $id) {
            id
            author {
              id
              photo {
                url(size: $size)
              }
            }
            mentions {
              id
              photo {
                url(size: $size)
              }
            }
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
      subscription subscribeToToOnUserUsage{
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
    expect(trimPaddingAndEmptyLines(fixedQuery)).toEqual(
      trimPaddingAndEmptyLines(`
        mutation registerUser($input: RegisterUserInput!) {
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
    expect(trimPaddingAndEmptyLines(fixedQuery)).toEqual(
      trimPaddingAndEmptyLines(`
        subscription subscribeToOnUserChange($id: ID!) {
          onUserChange(id: $id) {
            id
            name
          }
        }
      `),
    )
  })

  test('should work with enums', () => {
    const query = `
      query {
        user {
          id
          status
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(trimPaddingAndEmptyLines(fixedQuery)).toEqual(
      trimPaddingAndEmptyLines(`
        query fetchUser($id: ID!) {
          user(id: $id) {
            id
            status
          }
        }
      `),
    )
  })

  test('should work with union', () => {
    const query = `
      query {
        myNotifications {
          ... on FollowNotification {
            id
            user {
              id
              photo {
                url
              }
            }
          }
          ... on TweetNotification {
            id
            tweet {
              id
              author {
                photo {
                  url
                }
              }
            }
          }
        }
      }
    `
    const fixedQuery = fixGQLRequest(schema, query)
    expect(trimPaddingAndEmptyLines(fixedQuery)).toEqual(
      trimPaddingAndEmptyLines(`
        query fetchMyNotifications($size: ImageSize, $myNotificationsTweetAuthorPhotoSize: ImageSize) {
          myNotifications {
            ... on FollowNotification {
              id
              user {
                id
                photo {
                  url(size: $size)
                }
              }
            }
            ... on TweetNotification {
              id
              tweet {
                id
                author {
                  photo {
                    url(size: $myNotificationsTweetAuthorPhotoSize)
                  }
                }
              }
            }
          }
        }
      `),
    )
  })
})
