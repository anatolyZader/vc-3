/* eslint-disable no-unused-vars */
import React from 'react';
import './header.css';
import Logo from './Logo';
import AuthPanel from '../auth-components/AuthPanel';

function Header() {
  return (
      <div className="header">
        < Logo />
        < AuthPanel />
      </div>

  );
}

export default Header;

