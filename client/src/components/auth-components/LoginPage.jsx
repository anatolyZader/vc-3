import { useContext, useState } from 'react';
import { AuthContext } from './AuthContext';
import { TextField, Button, Typography, Box, Alert } from '@mui/material';

const LoginPage = () => {
  const { login, googleLogin, logout, userProfile, isAuthenticated } = useContext(AuthContext);

  // State for manual login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);

  // Handle manual login form submission
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch.post('/api/login', {
        username,
        password,
      });

      // Assuming the backend responds with a token
      const { token } = response.data;

      // Store the token in localStorage (or sessionStorage)
      localStorage.setItem('authToken', token);

      // Call the login function from AuthContext to update the app state
      login();

      // Clear any error messages
      setLoginError(null);
    } catch (error) {
      // Handle login failure
      setLoginError('Invalid credentials. Please try again.');
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Login Panel
      </Typography>

      {!isAuthenticated ? (
        <Box>
          {/* Google Login Button */}
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => googleLogin()}
            sx={{ mb: 2 }}
          >
            Sign in with Google 🚀
          </Button>

          {/* Manual Login Form */}
          <form onSubmit={handleLogin}>
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Username"
                variant="outlined"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Box>
            {loginError && <Alert severity="error">{loginError}</Alert>}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
            >
              Manual Login
            </Button>
          </form>
        </Box>
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>
            User is logged in
          </Typography>
          {userProfile && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img
                src={userProfile.picture}
                alt="user"
                style={{ width: 100, height: 100, borderRadius: '50%', marginBottom: '16px' }}
              />
              <Typography>Name: {userProfile.name}</Typography>
              <Typography>Email: {userProfile.email}</Typography>
            </Box>
          )}
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            onClick={logout}
            sx={{ mt: 2 }}
          >
            Logout
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default LoginPage;
