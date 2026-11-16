import React, { createContext, useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';

const INITIAL_STATE = {
  auth: JSON.parse(localStorage.getItem('auth')) || null,
  loading: false,
  error: null,
};

export const AuthContext = createContext(INITIAL_STATE);

const AuthReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        auth: null,
        loading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        auth: action.payload,
        loading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        auth: null,
        loading: false,
        error: action.payload,
      };
    case 'REFRESH_TOKEN':
      // token diperpanjang otomatis: hanya token yang diganti, data pengguna tetap
      if (!state.auth) return state;
      return {
        ...state,
        auth: { ...state.auth, token: action.payload },
      };
    case 'LOGOUT':
      return {
        auth: null,
        loading: false,
        error: null,
      };

    default:
      return state;
  }
};

export const AuthContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(AuthReducer, INITIAL_STATE);

  useEffect(() => {
    localStorage.setItem('auth', JSON.stringify(state.auth));
  }, [state.auth]);

  return (
    <AuthContext.Provider
      value={{
        auth: state.auth,
        loading: state.loading,
        error: state.error,
        dispatch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthContextProvider.propTypes = {
  children: PropTypes.element,
};
