import React from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/variables.css';
import './dashboard.css';
import { Dashboard } from './Dashboard';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
);
