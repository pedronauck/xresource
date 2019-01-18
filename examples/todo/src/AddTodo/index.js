import React, { useEffect, useState } from 'react'
import { Flex, Box } from 'rebass'
import { Button, Drawer, Input, Spin } from 'antd'
import { on, emit } from 'kord'

import * as api from '../api'

export const AddTodo = () => {
  const [showing, setShowing] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    on('todo:open-modal', () => setShowing(true))
  })

  const reset = () => {
    setSubmitting(false)
    setShowing(false)
    setTitle('')
    setBody('')
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    const todo = await api.createTodo({ title, body, completed: false })
    emit('todo:create-todo', todo)
    reset()
  }

  return (
    <Drawer
      width={400}
      title="Creating Todo"
      visible={showing}
      closable={!submitting}
      onClose={() => setShowing(false)}
    >
      {submitting ? (
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
