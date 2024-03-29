import { readFileSync } from 'fs-extra'
import { trimPadding } from '../util/util'
import { generateGQLHook } from './generate-gql-hook'
import { loadSchema } from './graphql-util'

const schema = loadSchema('test/schema.gql')
const prettierOptions = { ...JSON.parse(readFileSync('.prettierrc', 'utf8')), parser: 'typescript' }
const generateGQLHookOptions = { prettierOptions, packageName: '@apollo/client' }

describe('generateGQLHook', () => {
  test('should generate query and its types', async () => {
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
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

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
					__typename?: 'User'
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

  test('should generate query and its types without gql', async () => {
    const query = `
      const query = \`
        query {
          user {
            name
          }
        }
      \`
    `
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

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
					__typename?: 'User'
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

  test('should preserve the client used', async () => {
    const query = `
      import { QueryHookOptions, useQuery } from '../my-client'
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
        }
      \`
    `
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { QueryHookOptions, useQuery } from '../my-client'
        import gql from 'graphql-tag'

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
					__typename?: 'User'
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

  test('should generate query with custom package and sort imports', async () => {
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
    const hook = await generateGQLHook(schema, query, { prettierOptions, packageName: 'y-package' })
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
      import gql from 'graphql-tag'
      import { QueryHookOptions, useQuery } from 'y-package'

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
					__typename?: 'User'
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

  test('should generate query and its types with batched query', async () => {
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
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

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
					__typename?: 'User'
        }

        export interface TweetType {
          id: string
          content: string
					__typename?: 'Tweet'
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

  test('should generate query and its types with batched query and multiple inputs', async () => {
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
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

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
					__typename?: 'User'
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

  test('should generate query and its types with enum', async () => {
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
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

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
					__typename?: 'User'
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

  test('should generate query with optional request parameter if none of the imports are mandatory', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          users {
            id
            status
          }
        }
      \`
    `
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`import { QueryHookOptions, useQuery } from '@apollo/client'
      import gql from 'graphql-tag'

      const query = gql\`
        query fetchUsers($next: String) {
          users(next: $next) {
            id
            status
          }
        }
      \`

      export interface RequestType {
        next?: string | undefined
      }

      export interface QueryType {
        users: UserType[]
      }

      export interface UserType {
        id: string
        status?: UserStatus
        __typename?: 'User'
      }

      export enum UserStatus {
        ACTIVE = 'ACTIVE',
        INACTIVE = 'INACTIVE',
      }

      export function useUsersQuery(
        request?: RequestType,
        options?: QueryHookOptions<QueryType, RequestType>,
      ) {
        return useQuery<QueryType, RequestType>(query, {
          variables: request,
          ...options,
        })
      }
      `),
    )
  })

  test('should generate query with date', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            id
            createdAt
          }
        }
      \`
    `
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query fetchUser($id: ID!) {
            user(id: $id) {
              id
              createdAt
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
          createdAt?: DateTime
					__typename?: 'User'
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

  test('should generate mutation and its types', async () => {
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
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { MutationHookOptions, useMutation } from '@apollo/client'
        import gql from 'graphql-tag'

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
					__typename?: 'RegisterUserInput'
        }

        export interface MutationType {
          registerUser: UserType
        }

        export interface UserType {
          id: string
          name?: string
          email?: string
					__typename?: 'User'
        }

        export function useRegisterUserMutation(options?: MutationHookOptions<MutationType, RequestType>) {
          return useMutation<MutationType, RequestType>(mutation, options)
        }
    `),
    )
  })

  test('should generate subscription and its types', async () => {
    const query = `
      import gql from 'graphql-tag'

      const subscription = gql\`
        subscription {
          onUserChange {
            id
            name
          }
        }
      \`
    `
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { SubscriptionHookOptions, useSubscription } from '@apollo/client'
        import gql from 'graphql-tag'

        const subscription = gql\`
          subscription subscribeToOnUserChange($id: ID!) {
            onUserChange(id: $id) {
              id
              name
            }
          }
        \`

        export interface RequestType {
          id: string
        }

        export interface SubscriptionType {
          onUserChange: UserType
          __typename?: 'Subscription'
        }

        export interface UserType {
          id: string
          name?: string
          __typename?: 'User'
        }

        export function useOnUserChangeSubscription(
          options?: SubscriptionHookOptions<SubscriptionType, RequestType>,
        ) {
          return useSubscription<SubscriptionType, RequestType>(subscription, options)
        }
    `),
    )
  })

  test('should generate query with shared variable', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
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
      \`
    `
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
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
        \`

        export interface RequestType {
          id: string | undefined
          size?: ImageSize | undefined
        }

        export enum ImageSize {
          SMALL = 'SMALL',
          NORMAL = 'NORMAL',
          LARGE = 'LARGE',
        }

        export interface QueryType {
          tweet?: TweetType
        }

        export interface TweetType {
          id: string
          author: UserType
          mentions?: UserType[]
          __typename?: 'Tweet'
        }

        export interface UserType {
          id: string
          photo?: ImageType
          __typename?: 'User'
        }

        export interface ImageType {
          url: string
          __typename?: 'Image'
        }

        export function useTweetQuery(
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

  test('should generate query with no request type if query has no parameters', async () => {
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
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
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

        export interface QueryType {
          me?: UserType
        }

        export interface UserType {
          id: string
          name?: string
          email?: string
					__typename?: 'User'
        }

        export function useMeQuery(options?: QueryHookOptions<QueryType, never>) {
          return useQuery<QueryType, never>(query, options)
        }
    `),
    )
  })

  test('should generate lazy query with no parameters', async () => {
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
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { LazyQueryHookOptions, useLazyQuery } from '@apollo/client'
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

        export interface QueryType {
          me?: UserType
        }

        export interface UserType {
          id: string
          name?: string
          email?: string
					__typename?: 'User'
        }

        export function useMeQuery(options?: LazyQueryHookOptions<QueryType, never>) {
          return useLazyQuery<QueryType, never>(lazyQuery, options)
        }
    `),
    )
  })

  test('should generate lazy query and its types', async () => {
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
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { LazyQueryHookOptions, useLazyQuery } from '@apollo/client'
        import gql from 'graphql-tag'

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
					__typename?: 'User'
        }

        export function useUserQuery(
          request: RequestType,
          options?: LazyQueryHookOptions<QueryType, RequestType>,
        ) {
          return useLazyQuery<QueryType, RequestType>(lazyQuery, {
            variables: request,
            ...options,
          })
        }
    `),
    )
  })

  test('should generate query with no request type if query has no parameters', async () => {
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
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { MutationHookOptions, useMutation } from '@apollo/client'
        import gql from 'graphql-tag'

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
					__typename?: 'User'
        }

        export function useSignInMutation(options?: MutationHookOptions<MutationType, never>) {
          return useMutation<MutationType, never>(mutation, options)
        }
    `),
    )
  })

  test('should generate query with union', async () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query fetchMyNotifications($size: ImageSize) {
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
                  id
                  photo {
                    url(size: $size)
                  }
                }
              }
            }
          }
        }
      \`
    `
    const hook = await generateGQLHook(schema, query, generateGQLHookOptions)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import { QueryHookOptions, useQuery } from '@apollo/client'
        import gql from 'graphql-tag'

        const query = gql\`
          query fetchMyNotifications($size: ImageSize) {
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
                    id
                    photo {
                      url(size: $size)
                    }
                  }
                }
              }
            }
          }
        \`

        export interface RequestType {
          size?: ImageSize | undefined
        }

        export enum ImageSize {
          SMALL = 'SMALL',
          NORMAL = 'NORMAL',
          LARGE = 'LARGE',
        }

        export interface QueryType {
          myNotifications: NotificationType[]
        }

        export type NotificationType = FollowNotificationType | TweetNotificationType

        export interface FollowNotificationType {
          id: string
          user: UserType
          __typename?: 'FollowNotification'
        }

        export interface UserType {
          id: string
          photo?: ImageType
          __typename?: 'User'
        }

        export interface ImageType {
          url: string
          __typename?: 'Image'
        }

        export interface TweetNotificationType {
          id: string
          tweet: TweetType
          __typename?: 'TweetNotification'
        }

        export interface TweetType {
          id: string
          author: UserType
          __typename?: 'Tweet'
        }

        export function useMyNotificationsQuery(
          request?: RequestType,
          options?: QueryHookOptions<QueryType, RequestType>,
        ) {
          return useQuery<QueryType, RequestType>(query, {
            variables: request,
            ...options,
          })
        }
    `),
    )
  })
})
