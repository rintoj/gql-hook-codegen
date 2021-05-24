import { generateGQLHook } from './generate-gql-hook'
import { loadSchema } from './graphql-util'
import { trimPadding } from './util'

const schema = loadSchema('test/schema.gql')

describe('generateGQLHook', () => {
  test('should generate query and its types', () => {
    const query = `
      import gql from 'graphql-tag'

      const query = gql\`
        query {
          user {
            name
          }
        }
      \`
    `
    const hook = generateGQLHook(schema, query)
    expect(trimPadding(hook)).toEqual(
      trimPadding(`
        import gql from 'graphql-tag'
        import { useQuery } from '@apollo/react'

        const query = gql\`
          query ($id: ID!) {
            user(id: $id) {
              name
            }
          }
        \`

        export interface User {
          name?: string
        }

        export interface UserQueryRequest {
          id: string
        }

        export interface UserQueryResponse {
          user?: User
        }

        export function useUserQuery(request: UserQueryRequest) {
          return useQuery<UserQueryRequest, UserQueryResponse>(query, request, { skip: !request.id })
        }
    `),
    )
  })
})
