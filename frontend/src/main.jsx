import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles.css';
import './animations.css';
import './depth.css';
import './workspace.css';
import './travel.css';
import './tourgo.css';
import './login.css';
import './home.css';
import './explore.css';
import './checkout.css';
import './payment.css';
import './booking-success.css';
import './staff.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><AuthProvider><App /></AuthProvider></React.StrictMode>);
