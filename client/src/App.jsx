import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AuthPanel from './components/auth-components/AuthPanel';
import Header from './components/app-components/Header';
import SideBar from './components/app-components/SideBar';
import VideoPage from './components/videopage-components/VideoPage';
import VideoLibrary from './components/homepage-components/VideoLibrary';
import WatchHistory from './components/videopage-components/WatchHistory';
import NotFound from './components/NotFound';
import { AuthProvider } from './components/auth-components/AuthContext';
import PrivateRoute from './components/auth-components/PrivateRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-grid">
          <Header className="header" />
          <SideBar className="sidebar" />
          <div className="main">
            <Routes>
              <Route path="/login" element={<AuthPanel />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <VideoLibrary />
                  </PrivateRoute>
                }
              />
              <Route
                path="video"
                element={
                  <PrivateRoute>
                    <VideoPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="lib"
                element={
                  <PrivateRoute>
                    <VideoLibrary />
                  </PrivateRoute>
                }
              />
              <Route
                path="history"
                element={
                  <PrivateRoute>
                    <WatchHistory />
                  </PrivateRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
