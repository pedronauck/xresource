import { createResource } from './'
import basicResource from './fixtures/basic-resource'

describe('context', () => {
  test('basic context', async () => {
    const instance = basicResource.read()

    expect(instance.context$.value).toEqual({ foo: 'foo' })
    instance.setContext({ foo: 'bar' })
    expect(instance.context$.value).toEqual({ foo: 'bar' })
  })

  test('using multiple instance', async () => {
    const instanceX = basicResource.read()
    const instanceY = basicResource.read()

    instanceX.setContext({ foo: 'bar' })
    instanceY.setContext({ foo: 'baz' })

    expect(instanceX.context$.value).toEqual({ foo: 'bar' })
    expect(instanceY.context$.value).toEqual({ foo: 'baz' })
  })

  test('update context using function', async () => {
    const instance = basicResource.read()

    instance.setContext(prev => ({ foo: prev.foo + 'bar' }))
    expect(instance.context$.value).toEqual({ foo: 'foobar' })
  })

  test('update context using mutation', async () => {
    const instance = basicResource.read()

    instance.send('SET_FOO', 'bar')
    instance.send('SET_FOO', 'baz')
    instance.send('SET_FOO', 'foo')

    expect(instance.context$.value).toEqual({ foo: 'foo' })
  })

  test('update context inside effect', async () => {
    const instance = basicResource.read()
    instance.effects.changeFoo('bar')
    instance.effects.changeFoo('foo')

    expect(instance.context$.value).toEqual({ foo: 'foo' })
  })
})

describe('data', () => {
  test('retrieve first data', async () => {
    const instance = basicResource.read()

    instance.setContext({ foo: 'bar' })
    expect(instance.data$.value).toEqual({})

    await instance.update()
    expect(instance.data$.value).toEqual({
      bar: 'barbar',
    })
  })

  test('update data on context change', async () => {
    const instance = basicResource.read()

    await instance.update()
    expect(instance.data$.value).toEqual({
      bar: 'foobar',
    })

    instance.setContext({ foo: 'bar' })
    expect(instance.data$.value).toEqual({
      bar: 'barbar',
    })
  })

  test('get errors from data', async () => {
    const resource = createResource({
      data: {
        bar: () => {
          throw new Error('Some throw')
        },
      },
    })

    const instance = resource.read()
    await instance.update()
    expect(instance.error$.value.bar).toBeInstanceOf(Error)
    expect(instance.data$.value.bar).toBeNull()
  })

  test('reset all to initial', async () => {
    const instance = basicResource.read()

    instance.setContext({ foo: 'bar' })
    await instance.update()
    expect(instance.data$.value).toEqual({
      bar: 'barbar',
    })

    await instance.reset()
    expect(instance.context$.value).toEqual({ foo: 'foo' })
    expect(instance.data$.value).toEqual({
      bar: 'foobar',
    })
  })

  test('resource listeners', async () => {
    const instance = basicResource.read()
    const ctxChangeFn = jest.fn(() => null)
    const startFn = jest.fn(() => null)
    const doneFn = jest.fn(() => null)

    instance.onContextChange(ctxChangeFn)
    instance.onUpdateStart(startFn)
    instance.onUpdateDone(doneFn)
    instance.setContext({ foo: 'bar' })
    instance.setContext({ foo: 'foo' })

    await instance.update()

    expect(ctxChangeFn).toBeCalled()
    expect(ctxChangeFn).toBeCalledTimes(3)
    expect(ctxChangeFn).toBeCalledWith({ foo: 'foo' })
    expect(startFn).toBeCalled()
    expect(startFn).toBeCalledTimes(1)
    expect(startFn).toBeCalledWith()
    expect(doneFn).toBeCalled()
    expect(doneFn).toBeCalledTimes(3)
    expect(doneFn).toBeCalledWith({ bar: 'foobar' }, {})
  })
})
