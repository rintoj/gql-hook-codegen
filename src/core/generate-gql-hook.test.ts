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
        import { QueryHookOptions, useQuery } from '@apollo/client'

        const query = gql\`
          query fetchUser($id: ID!) {
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

        export function useUserQuery(
          request: RequestType,
          options?: QueryHookOptions<QueryType, RequestType>,
        ) {
          return useQuery<QueryType, RequestType>(query, {
            variables: request,
            skip: !request.id,
            ...options,
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
        import { QueryHookOptions, useQuery } from '@apollo/client'

        const query = gql\`
          query fetchUserAndTweet($id: ID!, $tweetId: ID!) {
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

        export function useUserAndTweetQuery(
          request: RequestType,
          options?: QueryHookOptions<QueryType, RequestType>,
        ) {
          return useQuery<QueryType, RequestType>(query, {
            variables: request,
            skip: !request.id || !request.tweetId,
            ...options,
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
        import { QueryHookOptions, useQuery } from '@apollo/client'

        const query = gql\`
          query fetchFollowers($id: ID!, $limit: Int) {
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

        export function useFollowersQuery(
          request: RequestType,
          options?: QueryHookOptions<QueryType, RequestType>,
        ) {
          return useQuery<QueryType, RequestType>(query, {
            variables: request,
            skip: !request.id,
            ...options,
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
        import { QueryHookOptions, useQuery } from '@apollo/client'

        const query = gql\`
          query fetchUser($id: ID!) {
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

        export function useUserQuery(
          request: RequestType,
          options?: QueryHookOptions<QueryType, RequestType>,
        ) {
          return useQuery<QueryType, RequestType>(query, {
            variables: request,
            skip: !request.id,
            ...options,
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
        import { MutationHookOptions, useMutation } from '@apollo/client'

        const mutation = gql\`
          mutation registerUser($input: RegisterUserInput!) {
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

        export function useRegisterUserMutation(options?: MutationHookOptions<MutationType, RequestType>) {
          return useMutation<MutationType, RequestType>(mutation, options)
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
        import { QueryHookOptions, useQuery } from '@apollo/client'

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

        export function useMeQuery(options?: QueryHookOptions<QueryType, void>) {
          return useQuery<QueryType, void>(query, options)
        }
    `),
    )
  })

  test('should generate lazy query with no parameters', () => {
    const query = `
      import gql from 'graphql-tag'

      const lazyQuery = gql\`
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
        import { LazyQueryHookOptions, useLazyQuery } from '@apollo/client'

        const lazyQuery = gql\`
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

        export function useMeQuery(options?: LazyQueryHookOptions<QueryType, void>) {
          return useLazyQuery<QueryType, void>(lazyQuery, options)
        }
    `),
    )
  })

  test('should generate lazy query and its types', () => {
    const query = `
      import gql from 'graphql-tag'

      const lazyQuery = gql\`
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
        import { LazyQueryHookOptions, useLazyQuery } from '@apollo/client'

        const lazyQuery = gql\`
          query fetchUser($id: ID!) {
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

        export function useUserQuery(
          request: RequestType,
          options?: LazyQueryHookOptions<QueryType, RequestType>,
        ) {
          return useLazyQuery<QueryType, RequestType>(lazyQuery, {
            variables: request,
            skip: !request.id,
            ...options,
          })
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
        import { MutationHookOptions, useMutation } from '@apollo/client'

        const mutation = gql\`
          mutation signIn {
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

        export function useSignInMutation(options?: MutationHookOptions<MutationType, void>) {
          return useMutation<MutationType, void>(mutation, options)
        }
    `),
    )
  })
})