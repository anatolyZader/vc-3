import { Link } from 'react-router-dom';
import NavBtn from './NavBtn';
import './navpanel.css';

function NavPanel() {
  return (
    <nav className="nav-panel">
      <ul>
        <li>
          <Link to="/lib" className="link-btn">
            <NavBtn btnName='library'/> 
          </Link>
        </li>
        <li>
          <Link to="/history" className="link-btn">
            <NavBtn btnName='history'/> 
          </Link>
        </li>
        <li>
          <Link to="/video" className="link-btn">
            <NavBtn btnName='video'/> 
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export default NavPanel;
