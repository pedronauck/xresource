import React, { useEffect } from 'react'
import { useResource } from '@xresource/react'
import { Flex, Box } from 'rebass'
import { List } from 'antd'
import { on } from 'kord'
import styled from 'styled-components'

import { Topbar } from './Topbar'
import { TodosResource } from './TodosResource'

const Title = styled.h1`
  font-size: 36px;
  margin: 0 0 20px 0;
`

const Wrapper = styled(Box)`
  width: 600px;
  margin: 0 auto;
`

export const TodoList = ({ renderItem }) => {
  const { ctx, data, loading, handlers } = useResource(TodosResource)

  useEffect(() => {
    on('todo:item-deleted', handlers.deleteOnList)
    on('todo:item-completed', handlers.setCompleted)
    on('todo:create-todo', handlers.addOnList)
  }, [])

  return (
    <Flex py={4}>
      <Wrapper>
        <Title>Todo List</Title>
        {!loading && (
          <Topbar
            filter={ctx.filter}
            query={ctx.query}
            onSearch={handlers.setQuery}
            onFilter={handlers.setFilter}
          />
        )}
        <Box mt={3}>
          <List
            bordered
            loading={loading}
            dataSource={data.todos || []}
            renderItem={renderItem}
          />
        </Box>
      </Wrapper>
    </Flex>
  )
}
