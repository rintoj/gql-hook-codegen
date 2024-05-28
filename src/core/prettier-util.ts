import * as fs from 'fs-extra'
import { resolve } from 'path'

function sanitizePetterOptions(options: Record<string, string>) {
  return Object.keys(options)
    .filter(key => !['plugins'].includes(key))
    .reduce((a, b) => ({ ...a, [b]: options[b] }), {})
}

export function getPrettierConfig() {
  const prettierConfigs = ['.prettierrc', '.prettierrc.json']
  let index = 0
  let prettierConfigFile = prettierConfigs[index]
  while (prettierConfigFile) {
    try {
      return sanitizePetterOptions(
        JSON.parse(fs.readFileSync(resolve(process.cwd(), prettierConfigFile), 'utf8')),
      )
    } catch (e) {
      // do nothing
    }
    prettierConfigFile = prettierConfigs[++index]
  }
  try {
    const packageJSON = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
    return sanitizePetterOptions(packageJSON.prettier)
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
