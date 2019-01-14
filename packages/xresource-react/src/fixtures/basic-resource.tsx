import { createResource } from 'xresource'

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
      source: async () =>
        new Promise(resolve => {
          setTimeout(() => resolve('bar'), 2000)
        }),
      modifiers: [(ctx, bar) => ctx.foo + bar],
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
