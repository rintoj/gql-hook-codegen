# gql-hook-codegen

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

This tool generates TypeScript types for queries/mutations written in an GraphQL project given a
valid GraphQL schema.

## Install

### Yarn

```sh
yarn add gql-hook-codegen
```

### NPM

```sh
npm install gql-hook-codegen
```

## How to use

Step 1: Create a Typescript file `use-user.gql.ts` with the following content

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

Step 2: Add schema file `schema.gql`

```gql
type User {
  id: ID!
  name: String
}

type Query {
  user(id: ID!): User
}
```

Step 3: Run the following code:

```sh
npx gql-hook-codegen generate --schemaFile './schema.gql'
```

Step 4: Script will update `use-user.gql.ts` to the following:

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

## More Examples

<!-- vscode-markdown-toc -->
1. [Schema](./docs/examples.md#Schema)
2. [Query](./docs/examples.md#Query)
3. [Query with no parameters](./docs/examples.md#Querywithnoparameters)
4. [Batched Queries](./docs/examples.md#BatchedQueries)
5. [Query with multiple inputs](./docs/examples.md#Querywithmultipleinputs)
6. [Query with enum](./docs/examples.md#Querywithenum)
7. [Query with date](./docs/examples.md#Querywithdate)
8. [Query with shared variable](./docs/examples.md#Querywithsharedvariable)
9. [Mutation](./docs/examples.md#Mutation)
10. [Lazy query](./docs/examples.md#Lazyquery)
11. [Query with union](./docs/examples.md#Querywithunion)

## Usage

```sh
gql-hook-codegen <command>

Commands:
  gql-hook-codegen generate [pattern]  Generate graphql query, mutation or
                                       subscription react hook in TypeScript

Options:
      --help        Show help                                          [boolean]
      --version     Show version number                                [boolean]
  -f, --schemaFile  Schema file               [string] [default: "./schema.gql"]
  -u, --schemaURL   URL to fetch graphql schema                         [string]
  -i, --ignore      Folders to ignore eg: "node_modules,lib"
                                              [string] [default: "node_modules"]
  -p, --package     Package name to use in generated code
                                            [string] [default: "@apollo/client"]
  -s, --save        Save schema locally if --schemaURL is used         [boolean]
  -v, --verbose     Run with verbose logging                           [boolean]
```

## Automatic Release

Here is an example of the release type that will be done based on a commit messages:

| Commit message      | Release type          |
| ------------------- | --------------------- |
| fix: [comment]      | Patch Release         |
| feat: [comment]     | Minor Feature Release |
| perf: [comment]     | Major Feature Release |
| doc: [comment]      | No Release            |
| refactor: [comment] | No Release            |
| chore: [comment]    | No Release            |
