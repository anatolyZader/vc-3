const React = require('react');
const { useContext, useState } = React;
const { AuthContext } = require('./AuthContext');
const EmailPasswordAuth = require('./EmailPasswordAuth');
const GoogleAuth = require('./GoogleAuth');
const Logout = require('./Logout');
const TwoStageVerification = require('./TwoStageVerification');

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
    <div className="login-container">
      <h1>Login Panel</h1>

      {!isAuthenticated ? (
        <div>
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
        </div>
      ) : (
        <div>
          <h2>User is logged in</h2>
          {userProfile && (
            <div className="user-profile">
              <img
                src={userProfile.picture}
                alt="user"
                className="user-image"
              />
              <p>Name: {userProfile.name}</p>
              <p>Email: {userProfile.email}</p>
            </div>
          )}
          <Logout onLogout={logout} />
        </div>
      )}
    </div>
  );
};

module.exports = LoginPage;
