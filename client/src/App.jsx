import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useContext } from 'react';
import LoginPage from './components/auth-components/LoginPage';
import Header from './components/app-components/Header';
import SideBar from './components/app-components/SideBar';
import VideoPage from './components/videopage-components/VideoPage';
import VideoLibrary from './components/homepage-components/VideoLibrary';
import WatchHistory from './components/videopage-components/WatchHistory';
import NotFound from './components/NotFound';
import { AuthProvider, AuthContext } from './components/auth-components/AuthContext';
import './app.css';

function AppContent() {
  const { isAuthenticated } = useContext(AuthContext);

  // Show the LoginPage if the user is not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show the main layout after successful login
  return (
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
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
