/* eslint-disable no-unused-vars */
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './components/homepage-components/HomePage';
import VideoPage from './components/videopage-components/VideoPage';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="video" element={<VideoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;