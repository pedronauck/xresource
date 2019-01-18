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
      source: () => Promise.resolve('bar'),
      modifiers: [(ctx, bar) => ctx.foo + bar],
    },
  },
  mutations: {
    SET_FOO: (ctx, foo) => ({ ...ctx, foo }),
  },
  effects: {
    changeFoo: (_, foo) => {
      _.setContext({ foo })
    },
  },
})
