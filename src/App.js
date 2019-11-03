import React, { useState, useEffect } from 'react';
import Amplify, { API, graphqlOperation } from 'aws-amplify';
import { withAuthenticator } from 'aws-amplify-react';

import awsconfig from './aws-exports';
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';
import * as subscriptions from './graphql/subscriptions';

// https://aws-amplify.github.io/docs/js/react#add-auth
Amplify.configure(awsconfig);

const STATUS_NEW = 'new';
const STATUS_DONE = 'done';
const STATUS_NOT_DONE = 'not done';

function App() {
  const [todoItems, setTodoItems] = useState([]);
  let textInput = React.createRef();

  // Get all items from dynamodb
  const fetchTodoItems = async () => {
    const { data } = await API.graphql(graphqlOperation(queries.listTodos));
    console.log('fetchTodoItems');
    return data.listTodos.items;
  };

  // Refresh the local copy of data.
  const reloadTodoItems = () => {
    (async () => setTodoItems(await fetchTodoItems()))();
  };

  // componentDidMount
  useEffect(reloadTodoItems, []);

  // TODO: Figure out how to set up subscription. Currently not working.
  //   Error: "Variable 'owner' has coerced Null value for NonNull type 'String!'"
  useEffect(() => {
    (async () => {
      API.graphql(graphqlOperation(subscriptions.onCreateTodo)).subscribe({
        next: ({
          value: {
            data: { createTodo },
          },
        }) => {
          setTodoItems(prev => [...prev, createTodo]);
        },
      });

      API.graphql(graphqlOperation(subscriptions.onUpdateTodo)).subscribe({
        next: ({
          value: {
            data: { updateTodo },
          },
        }) => {
          setTodoItems(prev => {
            // Maintain the list order.
            const id = prev.findIndex(item => item.id === updateTodo.id);
            prev[id] = updateTodo;
            return [...prev];
          });
        },
      });
    })();
  }, []);

  const addTodo = () => {
    if (!textInput || !textInput.current || !textInput.current.value) return;

    // Make sure that input matches CreateTodoInput schema.
    const input = {
      name: textInput.current.value,
      status: STATUS_NEW,
    };

    // Mutate dynamodb, then update local copy.
    API.graphql(graphqlOperation(mutations.createTodo, { input }));
    textInput.current.value = '';
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>TODO LIST</h1>
      </header>

      <main>
        <input type="text" ref={textInput} />
        <input type="button" value="Add Item" onClick={addTodo} />

        {todoItems.map((item, i) => {
          return <TodoItem key={i} item={item} />;
        })}
      </main>
    </div>
  );
}

function TodoItem({ item }) {
  const updateStatus = event => {
    // Make sure that input matches UpdateTodoInput schema.
    const input = {
      id: item.id,
      name: item.name,
      expectedVersion: item.version++,
      status: event.target.checked ? STATUS_DONE : STATUS_NOT_DONE,
    };
    API.graphql(graphqlOperation(mutations.updateTodo, { input }));
  };

  return (
    <p>
      <input type="checkbox" checked={item.status === STATUS_DONE} onChange={updateStatus} />
      {item.name}
    </p>
  );
}

// https://aws-amplify.github.io/docs/js/react#add-auth
export default withAuthenticator(App, true);
