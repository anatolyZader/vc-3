// App.jsx

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useContext } from 'react';
import LoginPage from './components/auth_components/LoginPage';
import Chat from './components/chat_components/Chat';
import MessageTest from './components/chat_components/MessageTest';
import NotFound from './components/NotFound';
import { AuthProvider, AuthContext } from './components/auth_components/AuthContext';
import { ChatProvider } from './components/chat_components/ChatContext';
import './app.css';

function AppContent() {
  const { isAuthenticated, authLoading } = useContext(AuthContext);

  if (authLoading) return null; // or spinner

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
          <Route path="/test-message" element={<MessageTest />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;
