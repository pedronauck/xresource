import gql from 'gql-tag'

const GET_TODOS = gql`
  query getTodos {
    todoes {
      id
      title
      completed
    }
  }
`

const GET_TODO = gql`
  query getTodo($id: ID) {
    todo(where: { id: $id }) {
      id
      title
      completed
      dueDate
      body
    }
  }
`

const UPDATE_TODO = gql`
  mutation updateTodo($id: ID, $data: TodoUpdateInput!) {
    updateTodo(where: { id: $id }, data: $data) {
      id
    }
  }
`

const DELETE_TODO = gql`
  mutation deleteTodo($id: ID) {
    deleteTodo(where: { id: $id }) {
      id
    }
  }
`

const CREATE_TODO = gql`
  mutation createTodo($data: TodoCreateInput!) {
    createTodo(data: $data) {
      id
      title
      completed
    }
  }
`

export const getTodos = async ({ client }) => {
  const { data } = await client.exec(GET_TODOS)
  return data.todoes
}

export const getTodo = async (client, id) => {
  const { data } = await client.exec(GET_TODO, { id })
  return data.todo
}

export const createTodo = async (client, body) => {
  const { data } = await client.exec(CREATE_TODO, { data: body })
  return data.createTodo
}

export const updateTodo = async (client, body) => {
  await client.exec(UPDATE_TODO, body)
}

export const deleteTodo = async (client, body) => {
  await client.exec(DELETE_TODO, body)
}
