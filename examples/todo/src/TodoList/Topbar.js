import React from 'react'
import { Flex, Box } from 'rebass'
import { Button, Input, Radio } from 'antd'

const RadioGroup = Radio.Group

export const Topbar = ({ query, onSearch, filter, onFilter, onCreate }) => (
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
    <Button type="primary" size="small" icon="plus" onClick={onCreate}>
      Create
    </Button>
  </Flex>
)
