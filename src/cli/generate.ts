import { red, yellow } from 'chalk'
import { command, input } from 'clifer'
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
  schemaUrl?: string
  package: string
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

async function generate(options: Options) {
  const files = sync(options.pattern, {
    onlyFiles: true,
    ignore: options.ignore,
  })
  if (!files.length) {
    console.log(yellow(`No files matching "${options.pattern}" found!`))
    return
  }

  try {
    renderText(`Fetching schema from ${options.schemaUrl ?? options.schemaFile}`, 'yellow')
    const schema = options.schemaUrl
      ? await fetchRemoteSchema(options.schemaUrl)
      : await fetchLocalSchema(options.schemaFile ?? 'schema.gql')

    if (options.schemaUrl && options.save) {
      await writeFile('schema.gql', print(schema))
    }

    for (const file of files) {
      await processFile(schema, file, options.package)
    }
    renderText('Done!', 'green')
  } catch (e: any) {
    console.error(red(e.message))
  }
}

export default command<Options>('generate')
  .option(input('pattern').description('File pattern').string().default('**/*.gql.ts'))
  .option(
    input('schemaFile').description('Location of the schema file').string().default('./schema.gql'),
  )
  .option(input('schemaUrl').description('Url to fetch graphql schema from ').string())
  .option(input('ignore').description('Folders to ignore').string().default('node_modules,lib'))
  .option(input('package').description('Default package to use').string().default('@apollo/client'))
  .option(input('save').description('Save schema locally if --schema-url is used'))
  .handle(generate)
