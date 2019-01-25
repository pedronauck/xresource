import React, { Fragment, useState } from 'react'

import { TodoList } from './TodoList'
import { TodoItem } from './TodoItem'
import { AddTodo } from './AddTodo'

const App = () => {
  const [drawerOpened, setDrawerOpened] = useState(false)
  const openDrawer = () => setDrawerOpened(true)
  const closeDrawer = () => setDrawerOpened(false)

  return (
    <Fragment>
      <AddTodo opened={drawerOpened} close={closeDrawer} />
      <TodoList
        onCreate={openDrawer}
        renderItem={item => <TodoItem item={item} />}
      />
    </Fragment>
  )
}

export default App
