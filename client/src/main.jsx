// main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './main.css'
import { GoogleOAuthProvider } from '@react-oauth/google'

// by importing the fonts in Main.jsx (entry point), they will be available globally throughout the app. 
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

// Although <GoogleOAuthProvider> is kept, in a pure redirect-based approach we don't actively use it below.
 
ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId="979848823566-jrtu8qq3dp2rpi0tk46renofrbii2re9.apps.googleusercontent.com">  
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </GoogleOAuthProvider>
);

