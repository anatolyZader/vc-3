/* eslint-disable no-unused-vars */
// App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPanel from './components/app-components/AuthPanel';
import Header from './components/app-components/Header';
import Logo from './components/app-components/Logo';
import LogoutBtn from './components/app-components/LogoutBtn';
import MainSection from './components/app-components/MainSection';
import SideBar from './components/app-components/SideBar';
import VideoPage from './components/videopage-components/VideoPage';
import VideoLibrary from './components/homepage-components/VideoLibrary';
import WatchHistory from './components/videopage-components/WatchHistory';
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
            <Route path="video" element={<VideoPage />} />
            <Route path="lib" element={<VideoLibrary />} />
            <Route path="history" element={<WatchHistory />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
