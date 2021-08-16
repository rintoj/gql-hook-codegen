# Examples

## Schema

```gql
scalar DateTime

enum UserStatus {
  ACTIVE
  INACTIVE
}

type Tweet {
  id: ID!
  content: String!
  author: User!
  mentions: [User]
}

type User {
  id: ID!
  name: String
  email: String
  isRegistered: Boolean
  numberOfFollowers: Int
  status: UserStatus
  follower(id: ID!): User
  followers(limit: Int): [User]!
  createdAt: DateTime
  updatedAt: DateTime
  photo: Image
}

input RegisterUserInput {
  name: String!
  email: String!
}

type Query {
  me: User
  user(id: ID!): User
  tweet(id: ID!): Tweet
  followers(id: ID!, limit: Int): [User]!
  myNotifications: [Notification]!
}

type Mutation {
  registerUser(input: RegisterUserInput!): User!
  setUserStatus(id: ID!, status: UserStatus!): User!
  signIn: User!
}

type Subscription {
  onUserChange(id: ID!): User!
}

enum ImageSize {
  SMALL
  NORMAL
  LARGE
}

type Image {
  url(size: ImageSize): String!
}

type FollowNotification {
  id: ID!
  user: User!
  following: Boolean!
}

type TweetNotification {
  id: ID!
  tweet: Tweet!
}

union Notification = FollowNotification | TweetNotification
```

## Query

### From

```ts
import gql from 'graphql-tag'

const query = gql`
  query {
    user {
      name
    }
  }
`
```

### To

```ts
import gql from 'graphql-tag'
import { QueryHookOptions, useQuery } from '@apollo/client'

const query = gql`
  query fetchUser($id: ID!) {
    user(id: $id) {
      name
    }
  }
`

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
```

## Query with no parameters

### From

```ts
import gql from 'graphql-tag'

const query = gql`
  query me {
    me {
      id
      name
      email
    }
  }
`
```

### To

```ts
import gql from 'graphql-tag'
import { QueryHookOptions, useQuery } from '@apollo/client'

const query = gql`
  query me {
    me {
      id
      name
      email
    }
  }
`

export interface QueryType {
  me?: UserType
}

export interface UserType {
  id: string
  name?: string
  email?: string
  __typename?: 'User'
}

export function useMeQuery(options?: QueryHookOptions<QueryType, void>) {
  return useQuery<QueryType, void>(query, options)
}
```

## Batched Queries

### From

```ts
import gql from 'graphql-tag'

const query = gql`
  query {
    user {
      name
    }
    tweet {
      id
      content
    }
  }
`
```

### To

```ts
import gql from 'graphql-tag'
import { QueryHookOptions, useQuery } from '@apollo/client'

const query = gql`
  query fetchUserAndTweet($id: ID!, $tweetId: ID!) {
    user(id: $id) {
      name
    }
    tweet(id: $tweetId) {
      id
      content
    }
  }
`

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
```

## Query with multiple inputs

### From

```ts
import gql from 'graphql-tag'

const query = gql`
  query {
    followers {
      name
    }
  }
`
```

### To

```ts
import gql from 'graphql-tag'
import { QueryHookOptions, useQuery } from '@apollo/client'

const query = gql`
  query fetchFollowers($id: ID!, $limit: Int) {
    followers(id: $id, limit: $limit) {
      name
    }
  }
`

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
```

## Query with enum

### From

```ts
import gql from 'graphql-tag'

const query = gql`
  query {
    user {
      id
      status
    }
  }
`
```

### To

```ts
import gql from 'graphql-tag'
import { QueryHookOptions, useQuery } from '@apollo/client'

const query = gql`
  query fetchUser($id: ID!) {
    user(id: $id) {
      id
      status
    }
  }
`

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
```

## Query with date

### From

```ts
import gql from 'graphql-tag'

const query = gql`
  query {
    user {
      id
      createdAt
    }
  }
`
```

### To

```ts
import gql from 'graphql-tag'
import { QueryHookOptions, useQuery } from '@apollo/client'

const query = gql`
  query fetchUser($id: ID!) {
    user(id: $id) {
      id
      createdAt
    }
  }
`

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
```

## Query with shared variable

### From

```ts
import gql from 'graphql-tag'

const query = gql`
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
```

### To

```ts
import gql from 'graphql-tag'
import { QueryHookOptions, useQuery } from '@apollo/client'

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
```

## Mutation

### From

```ts
import gql from 'graphql-tag'

const mutation = gql`
  mutation {
    registerUser {
      id
      name
      email
    }
  }
`
```

### To

```ts
import gql from 'graphql-tag'
import { MutationHookOptions, useMutation } from '@apollo/client'

const mutation = gql`
  mutation registerUser($input: RegisterUserInput!) {
    registerUser(input: $input) {
      id
      name
      email
    }
  }
`

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
```

## Lazy query

### From

```ts
import gql from 'graphql-tag'

const lazyQuery = gql`
  query me {
    me {
      id
      name
      email
    }
  }
`
```

### To

```ts
import gql from 'graphql-tag'
import { LazyQueryHookOptions, useLazyQuery } from '@apollo/client'

const lazyQuery = gql`
  query me {
    me {
      id
      name
      email
    }
  }
`

export interface QueryType {
  me?: UserType
}

export interface UserType {
  id: string
  name?: string
  email?: string
  __typename?: 'User'
}

export function useMeQuery(options?: LazyQueryHookOptions<QueryType, void>) {
  return useLazyQuery<QueryType, void>(lazyQuery, options)
}
```

## Query with union

### From

```ts
import gql from 'graphql-tag'

const query = gql`
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
`
```

### To

```ts
import gql from 'graphql-tag'
import { QueryHookOptions, useQuery } from '@apollo/client'

const query = gql`
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
`

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
  request: RequestType,
  options?: QueryHookOptions<QueryType, RequestType>,
) {
  return useQuery<QueryType, RequestType>(query, {
    variables: request,
    ...options,
  })
}
```
