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
        import { useQuery } from '@apollo/client'

        const query = gql\`
          query ($id: ID!) {
            user(id: $id) {
              name
            }
          }
        \`

        export interface RequestType {
          id: string | undefined
        }

        export interface QueryType {
          user?: UserType
        }

        export interface UserType {
          name?: string
        }

        export function useUserQuery(request: RequestType) {
          return useQuery<QueryType, RequestType>(query, {
            variables: request,
            skip: !request.id,
          })
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
        import { useQuery } from '@apollo/client'

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
          id: string | undefined
          tweetId: string | undefined
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
          return useQuery<QueryType, RequestType>(query, {
            variables: request,
            skip: !request.id || !request.tweetId,
          })
        }
    `),
    )
  })

  test('should generate query and its types with batched query', () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          followers {
            name
          }
        }
      \`
    `
    const hook = generateGQLHook(schema, query)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import gql from 'graphql-tag'
        import { useQuery } from '@apollo/client'

        const query = gql\`
          query ($id: ID!, $limit: Int) {
            followers(id: $id, limit: $limit) {
              name
            }
          }
        \`

        export interface RequestType {
          id: string | undefined
          limit?: number | undefined
        }

        export interface QueryType {
          followers: UserType[]
        }

        export interface UserType {
          name?: string
        }

        export function useFollowersQuery(request: RequestType) {
          return useQuery<QueryType, RequestType>(query, {
            variables: request,
            skip: !request.id,
          })
        }
    `),
    )
  })

  test('should generate query and its types with enum', () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            id
            status
          }
        }
      \`
    `
    const hook = generateGQLHook(schema, query)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import gql from 'graphql-tag'
        import { useQuery } from '@apollo/client'

        const query = gql\`
          query ($id: ID!) {
            user(id: $id) {
              id
              status
            }
          }
        \`

        export interface RequestType {
          id: string | undefined
        }

        export interface QueryType {
          user?: UserType
        }

        export interface UserType {
          id: string
          status?: UserStatus
        }

        export enum UserStatus {
          ACTIVE = 'ACTIVE',
          INACTIVE = 'INACTIVE',
        }

        export function useUserQuery(request: RequestType) {
          return useQuery<QueryType, RequestType>(query, {
            variables: request,
            skip: !request.id,
          })
        }
    `),
    )
  })

  test('should generate mutation and its types', () => {
    const query = `
      import gql from 'graphql-tag'

      const mutation = gql\`
        mutation {
          registerUser {
            id
            name
            email
            follower {
              id
            }
          }
        }
      \`
    `
    const hook = generateGQLHook(schema, query)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import gql from 'graphql-tag'
        import { useMutation } from '@apollo/client'

        const mutation = gql\`
          mutation ($input: RegisterUserInput!, $id: ID!) {
            registerUser(input: $input) {
              id
              name
              email
              follower(id: $id) {
                id
              }
            }
          }
        \`

        export interface RequestType {
          input: RegisterUserInputType
          id: string
        }

        export interface RegisterUserInputType {
          name: string
          email: string
        }

        export interface MutationType {
          registerUser: UserType
        }

        export interface UserType {
          id: string
          name?: string
          email?: string
          follower?: FollowerUserType
        }

        export interface FollowerUserType {
          id: string
        }

        export function useRegisterUserMutation() {
          return useMutation<MutationType, RequestType>(mutation, { optimisticResponse })
        }
    `),
    )
  })
})
