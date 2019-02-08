import React, { useState } from 'react'
import { Flex, Box } from 'rebass'
import { Button, Drawer, Input, Spin } from 'antd'
import { useResource } from '@xresource/react'

import { TodoResource } from '../TodoItem/TodoResource'

export const AddTodo = ({ opened, close }) => {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const { ctx, handlers, setContext } = useResource(TodoResource, {
    lazy: true,
  })

  const reset = () => {
    setContext({ submitting: false })
    close()
    setTitle('')
    setBody('')
  }

  const handleSubmit = async () => {
    await handlers.createTodo({ title, body, completed: false })
    reset()
  }

  return (
    <Drawer
      width={400}
      title="Creating Todo"
      visible={opened}
      closable={!ctx.submitting}
      onClose={close}
    >
      {ctx.submitting ? (
        <Spin />
      ) : (
        <>
          <Box>
            <Box mb={2}>Title</Box>
            <Input value={title} onChange={ev => setTitle(ev.target.value)} />
          </Box>
          <Box mt={3}>
            <Box mb={2}>Description</Box>
            <Input.TextArea
              rows={10}
              value={body}
              onChange={ev => setBody(ev.target.value)}
            />
          </Box>
          <Flex mt={3} justifyContent="space-between">
            <Button onClick={reset}>Cancel</Button>
            <Button type="primary" onClick={handleSubmit}>
              Create
            </Button>
          </Flex>
        </>
      )}
    </Drawer>
  )
}
