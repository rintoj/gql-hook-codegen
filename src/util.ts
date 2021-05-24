export function required<T>(value: T | null | undefined, name: string): T {
  if (!value) {
    throw new Error(`Did not find a required value: ${name}`)
  }
  return value
}

export function trimPadding(content: string) {
  return content
    .split('\n')
    .map(i => i.trim())
    .filter(i => i !== '')
}
