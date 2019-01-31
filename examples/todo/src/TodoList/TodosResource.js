import { createResource } from 'xresource'
import match from 'match-sorter'

import * as api from '../api'

const findByQuery = (ctx, todos) => {
  if (!ctx.query.length) return todos
  return match(todos, ctx.query, { keys: ['title'] })
}

const filterByFilter = (ctx, todos) => {
  if (ctx.filter === 'all') return todos
  return todos.filter(todo => todo.completed)
}

const deleteOnList = (todos, id) => {
  return todos.filter(todo => todo.id !== id)
}

const setCompleted = (todos, id) =>
  todos.map(todo => {
    if (todo.id !== id) return todo
    return { ...todo, completed: !todo.completed }
  })

export const TodosResource = createResource(() => ({
  id: 'todos',
  context: {
    query: '',
    filter: 'all',
    blocked: false,
  },
  data: {
    todos: {
      source: api.getTodos,
      modifiers: [findByQuery, filterByFilter],
    },
  },
  on: {
    DELETE_ITEM: 'deleteItem',
    COMPLETE_ITEM: 'completeItem',
    CREATE_ITEM: 'createItem',
    TOGGLE_BLOCKED: 'toggleBlocked',
  },
  handlers: {
    toggleBlocked: _ => {
      _.setContext(ctx => ({ blocked: !ctx.blocked }))
    },
    setFilter: (_, filter) => {
      _.setContext({ filter })
    },
    setQuery: (_, query) => {
      _.setContext({ query })
    },
    deleteItem: (_, id) => {
      _.setData(prev => ({ todos: deleteOnList(prev.todos, id) }))
    },
    completeItem: (_, id) => {
      _.setData(prev => ({ todos: setCompleted(prev.todos, id) }))
    },
    createItem: (_, todo) => {
      _.setData(prev => ({ todos: prev.todos.concat([todo]) }))
    },
  },
}))
