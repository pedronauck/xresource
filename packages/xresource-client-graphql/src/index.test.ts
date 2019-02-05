import gql from 'gql-tag'
import { createClient, createRequestMiddleware } from './'

const authMiddleware = createRequestMiddleware((operation, next) => {
  operation.setHeaders({
    authorization:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJzaW9uIjoxLCJ0b2tlbklkIjoiNDQ2ZjRlZWItMmU2Ni00OGVhLWFhN2ItNTYzMDBmNzdjYzU1In0.WndxPk5pJTRJ6WA5Kk_lxT0wk-o1xAhuf_X4z1HA3nA',
  })

  return next(operation)
})

const GET_TODOS = gql`
  query getTodos {
    todoes {
      id
      title
      completed
    }
  }
`

describe('axios client', () => {
  test('simple query', async () => {
    const client = createClient({
      url:
        'https://api-euwest.graphcms.com/v1/cjqxsbo7x8wsu01dnqo5pyvye/master',
      middlewares: [authMiddleware],
    })

    const res = await client.exec(GET_TODOS)
    expect(res.data.data.todoes.length).toBeGreaterThan(0)
  })
})
