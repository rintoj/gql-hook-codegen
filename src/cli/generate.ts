import { red, yellow } from 'chalk'
import { sync } from 'fast-glob'
import * as fs from 'fs-extra'
import { DocumentNode, print } from 'graphql'
import { generateGQLHook, getPrettierOptions } from '../core'
import { fetchLocalSchema, fetchRemoteSchema } from '../util/fetch-schema'
import { md5Hex } from '../util/util'
import { renderStatus, renderText } from './render-status'

interface Options {
  pattern: string
  schemaFile?: string
  schemaURL?: string
  packageName: string
  ignore?: string[]
  save?: boolean
}

const prettierOptions = getPrettierOptions()

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

async function processFile(schema: DocumentNode, file: string, packageName: string) {
  renderStatus(file, 'Processing', 'yellow', false)
  const tsContent = await readFile(file)
  const idBefore = md5Hex(tsContent)
  const hook = await generateGQLHook(schema, tsContent, { prettierOptions, packageName })
  const idAfter = md5Hex(hook)
  if (idBefore === idAfter) {
    renderStatus(file, 'NO CHANGE', 'gray', true)
  } else {
    await writeFile(file, hook)
    renderStatus(file, 'UPDATED', 'green', true)
  }
}

export async function generate(options: Options) {
  const files = sync(options.pattern, {
    onlyFiles: true,
    ignore: options.ignore,
  })
  if (!files.length) {
    console.log(yellow(`No files matching "${options.pattern}" found!`))
    return
  }

  try {
    renderText(`Fetching schema from ${options.schemaURL ?? options.schemaFile}`, 'yellow')
    const schema = options.schemaURL
      ? await fetchRemoteSchema(options.schemaURL)
      : await fetchLocalSchema(options.schemaFile ?? 'schema.gql')

    if (options.schemaURL && options.save) {
      await writeFile('schema.gql', print(schema))
    }

    for (const file of files) {
      await processFile(schema, file, options.packageName)
    }
    renderText('Done!', 'green')
  } catch (e: any) {
    console.error(red(e.message))
  }
}
