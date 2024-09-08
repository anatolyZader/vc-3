/* eslint-disable react/prop-types */
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    children
  ) : (
    <div>
      <h2>You must be logged in to view this page.</h2>
      <Navigate to="/login" />
    </div>
  );
};

export default PrivateRoute;
