import * as fs from 'fs-extra'
import { readFile } from 'fs-extra'
import * as gql from 'graphql'
import { getIntrospectionQuery } from 'graphql/utilities/getIntrospectionQuery'
import fetch from 'node-fetch'

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: { [key: string]: string }
}

export async function fetchRemoteSchema(
  graphqlURL: string,
  options: Options = {},
): Promise<gql.DocumentNode> {
  const response = await fetch(graphqlURL, {
    method: options.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify({ query: getIntrospectionQuery() }),
  })
  if (!response.ok) {
    throw new Error(response.statusText)
  }
  const { data, errors } = await response.json()
  if (errors) {
    throw new Error(JSON.stringify(errors))
  }
  return gql.parse(gql.printSchema(gql.buildClientSchema(data)))
}

export async function fetchLocalSchema(file: string): Promise<gql.DocumentNode> {
  if (!fs.existsSync(file)) {
    throw new Error(
      `Error: The schema file at ${file} could not be found. Please use the '--schema-file' option. Refer to '--help' for additional details.`,
    )
  }
  const content = await new Promise<string>((resolve, reject) =>
    readFile(file, 'utf8', (error, data) => (error ? reject(error) : resolve(data))),
  )
  return gql.parse(content)
}
