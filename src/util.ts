import * as crypto from 'crypto'

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

export interface ById<T> {
  [id: string]: T
}

export function md5Hex(data: string) {
  return crypto.createHash('md5').update(data).digest('hex')
}

export function reduceToArray<A, T>(
  array: A[] | undefined,
  mapper: (item: A, index: number) => T,
  initial: T[] = [],
) {
  return (
    array?.reduce(
      (accumulator: T[], item: A, index: number): T[] => [...accumulator, mapper(item, index)],
      initial,
    ) ?? []
  )
}

export function reduceToFlatArray<A, T>(
  array: A[] | undefined,
  mapper: (item: A, index: number) => T[],
  initial: T[] = [],
) {
  return (
    array?.reduce(
      (accumulator: T[], item: A, index: number): T[] => [...accumulator, ...mapper(item, index)],
      initial,
    ) ?? []
  )
}
