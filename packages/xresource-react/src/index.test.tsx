import * as React from 'react'
import { render, waitForElement } from 'react-testing-library'

import basicResource from './fixtures/basic-resource'
import { useResource } from './'

test('using a basic resource', async () => {
  const Foo = () => {
    const { context, data } = useResource(basicResource)
    return <div>{context.foo + data.bar}</div>
  }

  const { getByText } = render(<Foo />)
  await waitForElement(() => getByText('foofoobar'))
})

test('without update on read', async () => {
  const Foo = () => {
    const { context, data } = useResource(basicResource, {
      updateOnRead: false,
    })

    return <div>{context.foo + data.bar}</div>
  }

  const { getByText } = render(<Foo />)
  await waitForElement(() => getByText('fooundefined'))
})
