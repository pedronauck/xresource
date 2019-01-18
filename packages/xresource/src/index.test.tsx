import { createResource } from './'
import BasicResource from './fixtures/basic-resource'

const setupBasicInstance = () => {
  const instance = BasicResource.read()
  instance.start()
  return instance
}

describe('context', () => {
  test('throw if is not started', async () => {
    const instance = BasicResource.read()

    const fn = () => instance.setContext({ foo: 'bar' })
    expect(fn).toThrow()
  })

  test('with initial arguments', async () => {
    const resource = createResource(foo => ({
      context: {
        foo,
      },
      data: {
        bar: () => 'bar',
      },
    }))

    const instance = resource
      .with('foo')
      .read()
      .start()

    expect(instance.getContext()).toEqual({ foo: 'foo' })
  })

  test('basic context', async () => {
    const { context$, data$, error$, ...instance } = setupBasicInstance()
    const contextNext = jest.spyOn(context$, 'next')
    const dataNext = jest.spyOn(data$, 'next')
    const errorNext = jest.spyOn(error$, 'next')

    expect(instance.getContext()).toEqual({ foo: 'foo' })
    instance.setContext({ foo: 'bar' })

    expect(contextNext).toBeCalledTimes(1)
    expect(dataNext).toBeCalledTimes(1)
    expect(errorNext).not.toBeCalled()
    expect(instance.getContext()).toEqual({ foo: 'bar' })
  })

  test('using multiple instance', async () => {
    const instanceX = setupBasicInstance()
    const instanceY = setupBasicInstance()

    instanceX.setContext({ foo: 'bar' })
    instanceY.setContext({ foo: 'baz' })

    expect(instanceX.getContext()).toEqual({ foo: 'bar' })
    expect(instanceY.getContext()).toEqual({ foo: 'baz' })
  })

  test('update just when change', async () => {
    const { context$, ...instance } = setupBasicInstance()
    const spy = jest.spyOn(context$, 'next')

    instance.setContext({ foo: 'foo' })
    expect(spy).not.toBeCalled()
  })

  test('update using function', async () => {
    const instance = setupBasicInstance()
    const update = jest.fn(prev => ({ foo: prev.foo + 'bar' }))

    instance.setContext(update)
    expect(update).toBeCalled()
    expect(update).toBeCalledTimes(1)
    expect(instance.getContext()).toEqual({ foo: 'foobar' })
  })

  test('update inside effect', async () => {
    const instance = setupBasicInstance()

    instance.handlers.changeFoo('bar')
    instance.handlers.changeFoo('foo')

    expect(instance.getContext()).toEqual({ foo: 'foo' })
  })
})

describe('data', () => {
  test('retrieve first data', async () => {
    const instance = setupBasicInstance()

    instance.setContext({ foo: 'bar' })
    expect(instance.getData()).toEqual({})

    await instance.load()
    expect(instance.getData()).toEqual({
      bar: 'barbar',
    })
  })

  test('update on context change', async () => {
    const instance = setupBasicInstance()

    await instance.load()
    expect(instance.getData()).toEqual({
      bar: 'foobar',
    })

    instance.setContext({ foo: 'bar' })
    expect(instance.getData()).toEqual({
      bar: 'barbar',
    })
  })

  test('update just when data change', async () => {
    const { data$, ...instance } = setupBasicInstance()
    const spy = jest.spyOn(data$, 'next')

    await instance.load()
    expect(instance.getData()).toEqual({ bar: 'foobar' })
    instance.setContext({ foo: 'foo' })
    expect(spy).toBeCalledTimes(1)
  })

  test('update data using setData', async () => {
    const { data$, ...instance } = setupBasicInstance()
    const spy = jest.spyOn(data$, 'next')

    await instance.load()
    instance.setData(prev => ({ bar: prev.bar + 'foo' }))
    expect(spy).toBeCalledTimes(2)
    expect(instance.getData()).toEqual({ bar: 'foobarfoo' })
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
    instance.start()
    await instance.load()
    expect(instance.getError().bar).toBeInstanceOf(Error)
    expect(instance.getData().bar).toBeNull()
  })

  test('reset all to initial', async () => {
    const instance = setupBasicInstance()

    instance.setContext({ foo: 'bar' })
    await instance.load()
    expect(instance.getData()).toEqual({
      bar: 'barbar',
    })

    await instance.reset()
    expect(instance.getContext()).toEqual({ foo: 'foo' })
    expect(instance.getData()).toEqual({
      bar: 'foobar',
    })
  })

  test('resource listeners', async () => {
    const instance = BasicResource.read()
    const startFn = jest.fn(() => null)
    const doneFn = jest.fn(() => null)

    instance.start()
    instance.onUpdateStart(startFn)
    instance.onUpdateDone(doneFn)
    instance.setContext({ foo: 'bar' })
    instance.setContext({ foo: 'foo' })

    await instance.load()

    expect(startFn).toBeCalled()
    expect(startFn).toBeCalledTimes(1)
    expect(startFn).toBeCalledWith()
    expect(doneFn).toBeCalled()
    expect(doneFn).toBeCalledTimes(3)
    expect(doneFn).toBeCalledWith({ bar: 'foobar' }, {})
  })
})
