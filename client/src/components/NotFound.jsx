/* eslint-disable no-unused-vars */
import React from 'react';
import { Link } from 'react-router-dom';
import './notfound.css'; // Optional: Include a CSS file for styling

function NotFound() {
  return (
    <div className="not-found">
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/home">Go Home</Link>
    </div>
  );
}

export default NotFound;
