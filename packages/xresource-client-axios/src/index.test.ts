import {
  createClient,
  createRequestMiddleware,
  createResponseMiddleware,
} from './'

const authMiddleware = createRequestMiddleware((operation, next) => {
  operation.setHeaders({
    'x-api-key': '4a814f4a-a22b-406b-b950-fd23128ad594',
  })

  return next(operation)
})

const normalizeMiddleware = createResponseMiddleware((operation, next) => {
  const { data } = operation.getContext()
  const newData = data.reduce((obj: any, { id, ...item }: any) => {
    return { ...obj, [id]: { ...item } }
  }, {})

  operation.setContext({ data: newData })
  return next(operation)
})

describe('axios client', () => {
  test.skip('simple request', async () => {
    const client = createClient({
      url: 'https://dog.ceo/api/breeds',
    })

    const { data } = await client.get('/list/all')
    expect(data.status).toBe('success')
    expect(Object.keys(data.message).length).toBeGreaterThan(0)
  })

  test('request middlewares', async () => {
    const client = createClient({
      url: 'https://api.thecatapi.com/v1',
      middlewares: [authMiddleware],
    })

    const { data } = await client.get('/images/search?limit=3')
    expect(data.length).toBe(3)
  })

  test('response middlewares', async () => {
    const client = createClient({
      url: 'https://api.thecatapi.com/v1',
      middlewares: [authMiddleware, normalizeMiddleware],
    })

    const { data } = await client.get('/images/search?limit=3')
    expect(Object.keys(data).length).toBe(3)
  })
})
