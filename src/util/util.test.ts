import { required } from './util'

describe('required', () => {
  test('should throw an error when value is null', () => {
    expect(() => required(null, 'test')).toThrowError('Did not find a required value: test')
  })
  test('should throw an error when value is undefined', () => {
    expect(() => required(undefined, 'test')).toThrowError('Did not find a required value: test')
  })
  test('should not throw an error when value is not undefined or null', () => {
    expect(() => required(1, 'test')).not.toThrowError('Did not find a required value: test')
  })
})
