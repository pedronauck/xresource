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
  const { ctx, data, send, loading, effects } = useResource(TodosResource)
  const { deleteOnList, setCompleted, addOnList } = effects

  useEffect(() => {
    on('todo:item-deleted', deleteOnList)
    on('todo:item-completed', setCompleted)
    on('todo:create-todo', addOnList)
  }, [])

  return (
    <Flex py={4}>
      <Wrapper>
        <Title>Todo List</Title>
        {!loading && (
          <Topbar
            filter={ctx.filter}
            query={ctx.query}
            onSearch={query => send('SET_QUERY', query)}
            onFilter={filter => send('SET_FILTER', filter)}
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
