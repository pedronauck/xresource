import { createResource } from '../'

interface Context {
  foo: string
}

interface Data {
  bar: string
}

export default createResource<Context, Data>({
  context: {
    foo: 'foo',
  },
  data: {
    bar: {
      source: (_, ctx) => Promise.resolve('bar'),
      modifiers: [(bar, ctx) => ctx.foo + bar],
    },
  },
  mutations: {
    SET_FOO: (ctx, foo) => ({ ...ctx, foo }),
  },
  effects: {
    changeFoo: (resource, foo) => {
      resource.send('SET_FOO', foo)
    },
  },
})
