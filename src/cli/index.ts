#!/usr/bin/env node

import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { generate } from './generate'

yargs(hideBin(process.argv))
  .command(
    'generate [pattern]',
    'Generate query/mutation react hooks in TS',
    yargs => {
      return yargs.positional('pattern', {
        describe: 'File pattern',
        default: 'src/**/*.gql.ts',
      })
    },
    argv => {
      generate({
        pattern: argv.pattern,
        graphqlURL: argv.graphqlURL as string,
        saveSchema: argv.save as boolean,
      })
    },
  )
  .option('graphqlURL', {
    alias: 'u',
    type: 'string',
    description: 'URL to fetch graphql schema',
  })
  .option('save', {
    alias: 's',
    type: 'boolean',
    description: 'Save remote schema locally',
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
  }).argv
