import {
  createClient,
  createRequestMiddleware,
  createResponseMiddleware,
} from '@xresource/client-graphql'

const authMiddleware = createRequestMiddleware((operation, next) => {
  operation.setHeaders({
    authorization: `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJzaW9uIjoxLCJ0b2tlbklkIjoiNDQ2ZjRlZWItMmU2Ni00OGVhLWFhN2ItNTYzMDBmNzdjYzU1In0.WndxPk5pJTRJ6WA5Kk_lxT0wk-o1xAhuf_X4z1HA3nA`,
  })

  return next(operation)
})

const parseData = createResponseMiddleware((operation, next) => {
  operation.setContext(operation.getContext().data)
  return next(operation)
})

export const client = createClient({
  url: 'https://api-euwest.graphcms.com/v1/cjqxsbo7x8wsu01dnqo5pyvye/master',
  middlewares: [authMiddleware, parseData],
})
