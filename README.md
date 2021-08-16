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

```ts
import { generateGQLHook } from 'gql-hook-codegen'
import { readFile } from 'fs-extra'
import * as gql from 'graphql'

const prettierOptions = {
  parser: 'typescript',
}

async function fetchLocalSchema(file: string): Promise<gql.DocumentNode> {
  const content = await readFile(file, 'utf8')
  return gql.parse(content)
}

async function processFile(schema: DocumentNode, file: string) {
  try {
    const tsContent = await readFile(file, 'utf8')
    const hook = generateGQLHook(schema, tsContent, prettierOptions)
    await writeFile(file, hook)
  } catch (e) {
    console.error(`${file} - [FAILED] - ${e.message}`)
    return false
  }
  return true
}

async function run() {
  const schema = await fetchLocalSchema('./schema.gql')
  await processFile(schema, './src/use-user.gql.ts')
}

run().catch(error => console.error(error))
```

Step 4: Script will update `use-user.gql.ts` to the following:

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

[More Examples](./docs/examples.md)

## Usage

```sh
gql-hook-codegen generate [src/**/*.gql.ts]
  [--schema FILE]
  [--graphqlURL URL]
  [--save]
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
