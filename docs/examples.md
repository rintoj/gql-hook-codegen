
# Examples

<!-- vscode-markdown-toc -->
* 1. [Schema](#Schema)
* 2. [Query](#Query)
	* 2.1. [From](#From)
	* 2.2. [To](#To)
* 3. [Query with no parameters](#Querywithnoparameters)
	* 3.1. [From](#From-1)
	* 3.2. [To](#To-1)
* 4. [Batched Queries](#BatchedQueries)
	* 4.1. [From](#From-1)
	* 4.2. [To](#To-1)
* 5. [Query with multiple inputs](#Querywithmultipleinputs)
	* 5.1. [From](#From-1)
	* 5.2. [To](#To-1)
* 6. [Query with enum](#Querywithenum)
	* 6.1. [From](#From-1)
	* 6.2. [To](#To-1)
* 7. [Query with date](#Querywithdate)
	* 7.1. [From](#From-1)
	* 7.2. [To](#To-1)
* 8. [Query with shared variable](#Querywithsharedvariable)
	* 8.1. [From](#From-1)
	* 8.2. [To](#To-1)
* 9. [Mutation](#Mutation)
	* 9.1. [From](#From-1)
	* 9.2. [To](#To-1)
* 10. [Lazy query](#Lazyquery)
	* 10.1. [From](#From-1)
	* 10.2. [To](#To-1)
* 11. [Query with union](#Querywithunion)
	* 11.1. [From](#From-1)
	* 11.2. [To](#To-1)

<!-- vscode-markdown-toc-config
	numbering=true
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

##  1. <a name='Schema'></a>Schema

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

##  2. <a name='Query'></a>Query

###  2.1. <a name='From'></a>From

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

###  2.2. <a name='To'></a>To

```ts
import { QueryHookOptions, useQuery } from '@apollo/client'
import gql from 'graphql-tag'

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

##  3. <a name='Querywithnoparameters'></a>Query with no parameters

###  3.1. <a name='From-1'></a>From

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

###  3.2. <a name='To-1'></a>To

```ts
import { QueryHookOptions, useQuery } from '@apollo/client'
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

##  4. <a name='BatchedQueries'></a>Batched Queries

###  4.1. <a name='From-1'></a>From

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

###  4.2. <a name='To-1'></a>To

```ts
import { QueryHookOptions, useQuery } from '@apollo/client'
import gql from 'graphql-tag'

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

##  5. <a name='Querywithmultipleinputs'></a>Query with multiple inputs

###  5.1. <a name='From-1'></a>From

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

###  5.2. <a name='To-1'></a>To

```ts
import { QueryHookOptions, useQuery } from '@apollo/client'
import gql from 'graphql-tag'

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

##  6. <a name='Querywithenum'></a>Query with enum

###  6.1. <a name='From-1'></a>From

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

###  6.2. <a name='To-1'></a>To

```ts
import { QueryHookOptions, useQuery } from '@apollo/client'
import gql from 'graphql-tag'

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

##  7. <a name='Querywithdate'></a>Query with date

Declare DateTime type in `custom.d.ts` at the root of your project

```ts
declare type DateTime = string
```

###  7.1. <a name='From-1'></a>From

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

###  7.2. <a name='To-1'></a>To

```ts
import { QueryHookOptions, useQuery } from '@apollo/client'
import gql from 'graphql-tag'

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

##  8. <a name='Querywithsharedvariable'></a>Query with shared variable

###  8.1. <a name='From-1'></a>From

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

###  8.2. <a name='To-1'></a>To

```ts
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
```

##  9. <a name='Mutation'></a>Mutation

###  9.1. <a name='From-1'></a>From

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

###  9.2. <a name='To-1'></a>To

```ts
import { MutationHookOptions, useMutation } from '@apollo/client'
import gql from 'graphql-tag'

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

##  10. <a name='Lazyquery'></a>Lazy query

###  10.1. <a name='From-1'></a>From

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

###  10.2. <a name='To-1'></a>To

```ts
import { LazyQueryHookOptions, useLazyQuery } from '@apollo/client'
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

##  11. <a name='Querywithunion'></a>Query with union

###  11.1. <a name='From-1'></a>From

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

###  11.2. <a name='To-1'></a>To

```ts
import { QueryHookOptions, useQuery } from '@apollo/client'
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
