import * as fs from 'fs-extra'
import { resolve } from 'path'

export function getPrettierConfig() {
  const prettierConfigs = ['.prettierrc', '.prettierrc.json']
  let index = 0
  let prettierConfigFile = prettierConfigs[index]
  while (prettierConfigFile) {
    try {
      return JSON.parse(fs.readFileSync(resolve(process.cwd(), prettierConfigFile), 'utf8'))
    } catch (e) {
      // do nothing
    }
    prettierConfigFile = prettierConfigs[++index]
  }
  try {
    console.log('reading from package.json')
    const packageJSON = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
    return packageJSON.prettier
  } catch (e) {
    // do nothing
  }
  return {
    arrowParens: 'avoid',
    bracketSpacing: true,
    endOfLine: 'lf',
    htmlWhitespaceSensitivity: 'css',
    jsxBracketSameLine: false,
    jsxSingleQuote: true,
    printWidth: 100,
    proseWrap: 'always',
    requirePragma: false,
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'all',
    useTabs: false,
  }
}

export function getPrettierOptions() {
  return {
    ...getPrettierConfig(),
    parser: 'typescript',
  }
}
