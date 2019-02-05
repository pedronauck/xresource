import React, { Fragment, useState } from 'react'
import { Provider as XResourceProvider } from '@xresource/react'

import { client } from './client'
import { TodoList } from './TodoList'
import { TodoItem } from './TodoItem'
import { AddTodo } from './AddTodo'

const App = () => {
  const [drawerOpened, setDrawerOpened] = useState(false)
  const openDrawer = () => setDrawerOpened(true)
  const closeDrawer = () => setDrawerOpened(false)

  return (
    <XResourceProvider client={client}>
      <Fragment>
        <AddTodo opened={drawerOpened} close={closeDrawer} />
        <TodoList
          onCreate={openDrawer}
          renderItem={item => <TodoItem item={item} />}
        />
      </Fragment>
    </XResourceProvider>
  )
}

export default App
