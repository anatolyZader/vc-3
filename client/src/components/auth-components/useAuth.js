
import { useContext } from 'react';

import { AuthContext } from '../components/app-components/AuthContext';



const useAuth = () => useContext(AuthContext);

export default useAuth;
