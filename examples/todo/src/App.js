import React from 'react'
import { Kord } from 'kord'

import { TodoList } from './TodoList'
import { TodoItem } from './TodoItem'
import { AddTodo } from './AddTodo'

const App = () => (
  <Kord>
    <>
      <TodoList renderItem={item => <TodoItem item={item} />} />
      <AddTodo />
    </>
  </Kord>
)

export default App
