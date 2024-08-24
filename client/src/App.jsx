/* eslint-disable no-unused-vars */
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPanel from './components/app-components/AuthPanel';
import Header from './components/app-components/Header';
import Logo from './components/app-components/Logo';
import LogoutBtn from './components/app-components/LogoutBtn';
import Main from './components/app-components/Main';
import SideBar from './components/app-components/SideBar';
import VideoDisplay from './components/videopage-components/VideoDisplay';
import VideoLibrary from './components/videopage-components/VideoLibrary';
import NotFound from './components/NotFound';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-grid">
        <Header className="header" />
        <SideBar className="sidebar" />
        <div className="main">
          <Routes>
            <Route path="/" element={<VideoLibrary />} />
            <Route path="video" element={<VideoDisplay />} />
            <Route path="lib" element={<VideoLibrary />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
