import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useContext } from 'react';
import LoginPage from './components/auth-components/LoginPage';
import Chat from './components/Chat';

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
      <div className="main-section">
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/chat" element={<Chat />} />
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
