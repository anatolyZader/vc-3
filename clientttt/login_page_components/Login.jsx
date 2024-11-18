import React, { useContext, useState } from 'react';
import { AuthContext } from './AuthContext';
import { Typography, Box } from '@mui/material';
import EmailPasswordAuth from './EmailPasswordAuth';
import GoogleAuth from './GoogleAuth';
import Logout from './Logout';
import TwoStageVerification from './TwoStageVerification';

const LoginPage = () => {
  const { login, googleLogin, logout, userProfile, isAuthenticated } = useContext(AuthContext);
  const [isVerifying, setIsVerifying] = useState(false);
  const [email, setEmail] = useState('');

  const handleProceedToVerification = (userEmail) => {
    setEmail(userEmail);
    setIsVerifying(true);
  };

  const handleVerificationComplete = () => {
    login(); // Complete authentication
    setIsVerifying(false);
  };

  const handleBackToLogin = () => {
    setIsVerifying(false);
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Login Panel
      </Typography>

      {!isAuthenticated ? (
        <Box>
          {isVerifying ? (
            <TwoStageVerification
              email={email}
              onVerify={handleVerificationComplete}
              onBackToLogin={handleBackToLogin}
            />
          ) : (
            <>
              <GoogleAuth onGoogleLogin={googleLogin} />
              <EmailPasswordAuth onProceedToVerification={handleProceedToVerification} />
            </>
          )}
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
          <Logout onLogout={logout} />
        </Box>
      )}
    </Box>
  );
};

export default LoginPage;
