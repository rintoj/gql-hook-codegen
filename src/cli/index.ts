#!/usr/bin/env node

import { cli, runCli } from 'clifer'
import generate from './generate'

runCli(cli('gql-hook-codegen').command(generate)).catch(e => console.error(e))
