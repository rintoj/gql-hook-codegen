#!/usr/bin/env node

import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { generate } from './generate'

export function cli(args: any) {
  yargs(hideBin(args))
    .command(
      'generate [pattern]',
      'Generate graphql query, mutation or subscription react hook in TypeScript',
      yargs => {
        return yargs.positional('pattern', {
          describe: 'File pattern',
          default: '**/*.gql.ts',
        })
      },
      argv => {
        generate({
          pattern: argv.pattern,
          schemaFile: argv.schemaFile as string,
          schemaURL: argv.schemaURL as string,
          package: argv.package as string,
          ignore: (argv?.ignore as string)?.split(','),
          save: argv.save as boolean,
        })
      },
    )
    .option('schemaFile', {
      alias: 'f',
      type: 'string',
      default: './schema.gql',
      description: 'Schema file',
    })
    .option('schemaURL', {
      alias: 'u',
      type: 'string',
      description: 'URL to fetch graphql schema',
    })
    .option('ignore', {
      alias: 'i',
      type: 'string',
      default: 'node_modules',
      description: 'Folders to ignore eg: "node_modules,lib"',
    })
    .option('package', {
      alias: 'p',
      type: 'string',
      default: '@apollo/client',
      description: 'Package name to use in generated code',
    })
    .option('save', {
      alias: 's',
      type: 'boolean',
      description: 'Save schema locally if --schemaURL is used',
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Run with verbose logging',
    })
    .demandCommand(1)
    .strictCommands().argv
}
