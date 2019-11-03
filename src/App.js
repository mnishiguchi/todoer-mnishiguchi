import React, { useState, useEffect } from 'react';
import Amplify, { API, graphqlOperation } from 'aws-amplify';
import { Connect } from 'aws-amplify-react';

import awsconfig from './aws-exports';
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';
import * as subscriptions from './graphql/subscriptions';
import './App.css';

// https://aws-amplify.github.io/docs/js/react#add-auth
Amplify.configure(awsconfig);

const STATUS_NEW = 'new';
const STATUS_DONE = 'done';
const STATUS_NOT_DONE = 'not done';

const noop = () => {};

// https://qiita.com/otanu/items/2c522a652e5843a5e2c5

function App({ initialTodoItems = [] }) {
  let textInput = React.createRef();

  const [todoItems, setTodoItems] = useState([]);

  // Get all items.
  const fetchTodoItems = async () => {
    const { data } = await API.graphql(graphqlOperation(queries.listTodos));
    return data.listTodos.items;
  };

  // componentDidMount
  useEffect(() => {
    (async () => {
      await setTodoItems(await fetchTodoItems());
    })();
  }, []);

  const addTodo = () => {
    if (textInput && textInput.current && textInput.current.value) {
      const input = {
        name: textInput.current.value,
        status: STATUS_NEW,
      };
      API.graphql(graphqlOperation(mutations.createTodo, { input }));
      textInput.current.value = '';
    }
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

      <Connect
        subscription={graphqlOperation(subscriptions.onCreateTodo)}
        onSubscriptionMsg={(prev, { onCreateTodo }) => {
          console.log('subscription', onCreateTodo);

          setTodoItems(prevTodoItems => [...prevTodoItems, onCreateTodo]);
          return prev;
        }}
      >
        {noop}
      </Connect>
      <Connect
        subscription={graphqlOperation(subscriptions.onUpdateTodo)}
        onSubscriptionMsg={(prev, { onUpdateTodo }) => {
          console.log('subscription', onUpdateTodo);
          setTodoItems(prevTodoItems => [
            ...prevTodoItems.filter(item => item.id !== onUpdateTodo.id),
            onUpdateTodo,
          ]);
          return prev;
        }}
      >
        {noop}
      </Connect>
    </div>
  );
}

function TodoItem({ item }) {
  const updateStatus = event => {
    const input = {
      ...item,
      status: event.target.checked ? STATUS_DONE : STATUS_NOT_DONE,
    };

    console.log(input);
    API.graphql(graphqlOperation(mutations.updateTodo, { input }));
  };

  return (
    <p>
      <input type="checkbox" checked={item.status === STATUS_DONE} onChange={updateStatus} />
      {item.name}
    </p>
  );
}

export default App;
