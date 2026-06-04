import './NavBar.scss';

import PlaceHolderLogo from '../assets/images/placeholder.png';
import { NavLink } from 'react-router';

export default function NavBar() {
    return (<nav className="navbar">
            <a href="/" className="brand">
                <img src={PlaceHolderLogo} alt="Logo" />
                MYODL
            </a>

            <div className="nav-links">
                <NavLink to="/">Home</NavLink>
                <NavLink to="/">Users</NavLink>
                <NavLink to="/">Groups</NavLink>
                <NavLink to="/">Demons List</NavLink>

                <a href="https://discord.com" className="login-link" target="_blank" rel="noopener noreferrer">
                    <img src={PlaceHolderLogo} />
                    Login
                </a>

                {/* under login */}

                <NavLink to="/">Personal List</NavLink>
                <NavLink to="/">Active Groups</NavLink>
                <NavLink to="/">Logout</NavLink>
            </div>
        </nav>);
}