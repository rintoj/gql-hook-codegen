import { generateGQLHook } from './generate-gql-hook'
import { loadSchema } from './graphql-util'
import { trimPadding } from './util'

const schema = loadSchema('test/schema.gql')

describe('generateGQLHook', () => {
  test('should generate query and its types', () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
        }
      \`
    `
    const hook = generateGQLHook(schema, query)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import gql from 'graphql-tag'
        import { useQuery } from '@apollo/react'

        const query = gql\`
          query ($id: ID!) {
            user(id: $id) {
              name
            }
          }
        \`

        export interface RequestType {
          id: string
        }

        export interface QueryType {
          user?: UserType
        }

        export interface UserType {
          name?: string
        }

        export function useUserQuery(request: RequestType) {
          return useQuery<RequestType, QueryType>(query, request, { skip: !request.id })
        }
    `),
    )
  })

  test('should generate query and its types with batched query', () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
          tweet {
            id
            content
          }
        }
      \`
    `
    const hook = generateGQLHook(schema, query)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import gql from 'graphql-tag'
        import { useQuery } from '@apollo/react'

        const query = gql\`
          query ($id: ID!, $tweetId: ID!) {
            user(id: $id) {
              name
            }
            tweet(id: $tweetId) {
              id
              content
            }
          }
        \`

        export interface RequestType {
          id: string
          tweetId: string
        }

        export interface QueryType {
          user?: UserType
          tweet?: TweetType
        }

        export interface UserType {
          name?: string
        }

        export interface TweetType {
          id: string
          content: string
        }

        export function useUserAndTweetQuery(request: RequestType) {
          return useQuery<RequestType, QueryType>(query, request, { skip: !request.id || !request.tweetId })
        }
    `),
    )
  })
})
