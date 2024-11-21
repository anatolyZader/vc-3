const React = require('react');
const { useState } = React;

const EmailPasswordAuth = ({ onProceedToVerification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Include cookies for session
      });

      if (response.ok) {
        onProceedToVerification(email); // Pass email to the parent for verification step
        setLoginError(null);
      } else {
        const data = await response.json();
        setLoginError(data.message || 'Invalid credentials');
      }
    } catch (error) {
      setLoginError('An error occurred during login. Please try again.');
    }
  };

  return (
    <form onSubmit={handleLogin} className="email-password-auth">
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {loginError && <div className="error-message">{loginError}</div>}
      <button type="submit">Manual Login</button>
    </form>
  );
};

module.exports = EmailPasswordAuth;
