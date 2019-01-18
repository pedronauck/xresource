import React from 'react'
import { Flex, Box } from 'rebass'
import { Button, Input, Radio } from 'antd'
import { emit } from 'kord'

const RadioGroup = Radio.Group

export const Topbar = ({ query, onSearch, filter, onFilter }) => (
  <Flex justifyContent="space-between" alignItems="center">
    <Box width={200}>
      <Input
        value={query}
        placeholder="Filter here..."
        onChange={ev => onSearch(ev.target.value)}
      />
    </Box>
    <Flex alignItems="center" flex={1} ml={3}>
      <RadioGroup onChange={ev => onFilter(ev.target.value)} value={filter}>
        <Radio value="all">All</Radio>
        <Radio value="completed">Completed</Radio>
      </RadioGroup>
    </Flex>
    <Button
      type="primary"
      onClick={() => emit('todo:open-modal')}
      size="small"
      icon="plus"
    >
      Create
    </Button>
  </Flex>
)
