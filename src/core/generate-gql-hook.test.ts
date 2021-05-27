import { readFileSync } from 'fs-extra'
import { trimPadding } from '../util/util'
import { generateGQLHook } from './generate-gql-hook'
import { loadSchema } from './graphql-util'

const schema = loadSchema('test/schema.gql')
const prettierOptions = { ...JSON.parse(readFileSync('.prettierrc', 'utf8')), parser: 'typescript' }

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
    const hook = generateGQLHook(schema, query, prettierOptions)
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
    const hook = generateGQLHook(schema, query, prettierOptions)
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

  test('should generate query and its types with batched query and multiple inputs', () => {
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
    const hook = generateGQLHook(schema, query, prettierOptions)
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
    const hook = generateGQLHook(schema, query, prettierOptions)
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
          }
        }
      \`
    `
    const hook = generateGQLHook(schema, query, prettierOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import gql from 'graphql-tag'
        import { useMutation } from '@apollo/client'

        const mutation = gql\`
          mutation ($input: RegisterUserInput!) {
            registerUser(input: $input) {
              id
              name
              email
            }
          }
        \`

        export interface RequestType {
          input: RegisterUserInputType
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
        }

        export function useRegisterUserMutation() {
          return useMutation<MutationType, RequestType>(mutation)
        }
    `),
    )
  })

  test('should generate query with no request type if query has no parameters', () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query me {
          me {
            id
            name
            email
          }
        }
      \`
    `
    const hook = generateGQLHook(schema, query, prettierOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import gql from 'graphql-tag'
        import { useQuery } from '@apollo/client'

        const query = gql\`
          query me {
            me {
              id
              name
              email
            }
          }
        \`

        export interface QueryType {
          me?: UserType
        }

        export interface UserType {
          id: string
          name?: string
          email?: string
        }

        export function useMeQuery() {
          return useQuery<QueryType, void>(query)
        }
    `),
    )
  })

  test('should generate query with no request type if query has no parameters', () => {
    const query = `
      import gql from 'graphql-tag'

      const mutation = gql\`
        mutation {
          signIn {
            id
          }
        }
      \`
    `
    const hook = generateGQLHook(schema, query, prettierOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import gql from 'graphql-tag'
        import { useMutation } from '@apollo/client'

        const mutation = gql\`
          mutation {
            signIn {
              id
            }
          }
        \`

        export interface MutationType {
          signIn: UserType
        }

        export interface UserType {
          id: string
        }

        export function useSignInMutation() {
          return useMutation<MutationType, void>(mutation)
        }
    `),
    )
  })
})
