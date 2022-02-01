import React from 'react';
import ReactDOM from 'react-dom';
import Router from "./Routes/Router";
import { Provider } from "react-redux";
import Store from "./Redux/Stores/Main";

ReactDOM.render(
  <React.StrictMode>
      <Provider store={Store}>
         <Router />
      </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

