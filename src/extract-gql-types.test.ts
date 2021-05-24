import { extractGQLTypes } from './extract-gql-types'
import { loadSchema, parseSchema } from './graphql-util'

const schema = loadSchema('test/schema.gql')

describe('extractGQLTypes', () => {
  test('should extract types', () => {
    const request: any = parseSchema(`
      query ($id: ID!) {
        user(id: $id) {
          id
        }
      }
    `)
    const types = extractGQLTypes(schema, request.definitions[0])
    console.log(JSON.stringify(types, null, 2))
    expect(types).toEqual([
      {
        name: 'Request',
        fields: [
          {
            name: 'id',
            type: 'ID',
            isNonNull: true,
          },
        ],
      },
      {
        name: 'Query',
        fields: [
          {
            name: 'user',
            type: 'User',
          },
        ],
      },
      {
        name: 'User',
        fields: [
          {
            name: 'id',
            type: 'ID',
            isNonNull: true,
          },
        ],
      },
    ])
  })
})
