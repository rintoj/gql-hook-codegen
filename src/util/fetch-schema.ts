import { readFile } from 'fs-extra'
import { getIntrospectionQuery } from 'graphql/utilities/getIntrospectionQuery'
import fetch from 'node-fetch'
import * as gql from 'graphql'

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: { [key: string]: string }
}

export async function fetchRemoteSchema(
  graphqlURL: string,
  options: Options,
): Promise<gql.DocumentNode> {
  const { data, errors } = await fetch(graphqlURL, {
    method: options.method ?? 'POST',
    headers: options.headers,
    body: JSON.stringify({ query: getIntrospectionQuery() }),
  }).then(response => response.json())

  if (errors) {
    throw new Error(JSON.stringify(errors))
  }
  return data
}

export async function fetchLocalSchema(file: string): Promise<gql.DocumentNode> {
  const content = await new Promise<string>((resolve, reject) =>
    readFile(file, 'utf8', (error, data) => (error ? reject(error) : resolve(data))),
  )
  return gql.parse(content)
}
