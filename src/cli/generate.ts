import { sync } from 'fast-glob'
import { red, yellow } from 'chalk'
import * as fs from 'fs-extra'
import { generateGQLHook } from '../core'
import { print, DocumentNode } from 'graphql'
import { fetchLocalSchema, fetchRemoteSchema } from '../util/fetch-schema'
import { md5Hex } from '../util/util'
import { renderNewLine, renderStatus, renderText } from './render-status'

interface Options {
  pattern: string
  graphqlURL?: string
  schema?: string
  saveSchema?: boolean
}

async function writeFile(file: string, content: string) {
  return await new Promise<void>((resolve, reject) =>
    fs.writeFile(file, content, error => (error ? reject(error) : resolve())),
  )
}

async function readFile(file: string) {
  return await new Promise<string>((resolve, reject) =>
    fs.readFile(file, 'utf8', (err, data) => (err ? reject(err) : resolve(data))),
  )
}

async function processFile(schema: DocumentNode, file: string) {
  renderStatus(file, 'Processing', 'yellow')
  const tsContent = await readFile(file)
  const idBefore = md5Hex(tsContent)
  const hook = generateGQLHook(schema, tsContent)
  const idAfter = md5Hex(hook)
  if (idBefore === idAfter) {
    renderStatus(file, 'NO CHANGE', 'gray')
  } else {
    await writeFile(file, hook)
    renderStatus(file, 'UPDATED', 'green')
    renderNewLine()
  }
}

export async function generate(options: Options) {
  const files = sync(options.pattern)
  if (!files.length) {
    console.log(yellow(`No files matching "${options.pattern}" found!`))
    return
  }

  try {
    renderText(`Fetching schema from ${options.graphqlURL ?? options.schema}`, 'yellow')
    const schema = options.graphqlURL
      ? await fetchRemoteSchema(options.graphqlURL)
      : await fetchLocalSchema(options.schema ?? 'schema.gql')

    if (options.graphqlURL && options.saveSchema) {
      writeFile('schema.gql', print(schema))
    }

    for (const file of files) {
      await processFile(schema, file)
    }
    renderText('Done!', 'green')
  } catch (e: any) {
    console.error(red(e.message))
  }
}
