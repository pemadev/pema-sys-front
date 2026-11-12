/* eslint-disable import/no-named-as-default-member */
import React from 'react';
import ReactDOMClient from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { AuthContextProvider } from './context/AuthContext';

// eslint-disable-next-line import/no-named-as-default
import reportWebVitals from './reportWebVitals';
import { store } from './store/Store';
import App from './App';
import './data';
import './assets/foto-karyawan.css';

const container = document.getElementById('root');
const root = ReactDOMClient.createRoot(container);

root.render(
  <Provider store={store}>
    <AuthContextProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthContextProvider>
  </Provider>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
