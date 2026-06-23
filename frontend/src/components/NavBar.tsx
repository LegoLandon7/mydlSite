import './NavBar.scss';

import PlaceHolderLogo from '../assets/images/placeholder.png';

import { NavLink } from 'react-router';
import { useState, useRef, useEffect } from 'react';

import { useAuth } from '../api/call/auth/auth';
import { useAuthActions } from '../api/call/auth/authActions';


export default function NavBar() {
    const user = useAuth((s) => s.user);

    const { login, logout } = useAuthActions();

    const [desktopDropdown, setDesktopDropdown] = useState(false);
    const [mobileDropdown, setMobileDropdown]   = useState(false);
    const [hamburgerOpen, setHamburgerOpen]     = useState(false);

    const desktopMenuRef = useRef<HTMLDivElement>(null);
    const hamburgerRef   = useRef<HTMLDivElement>(null);

    const closeAll = () => {
        setHamburgerOpen(false);
        setMobileDropdown(false);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (desktopMenuRef.current && !desktopMenuRef.current.contains(e.target as Node))
                setDesktopDropdown(false);
            if (hamburgerRef.current && !hamburgerRef.current.contains(e.target as Node))
                closeAll();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navLinks = (onClick?: () => void) => (
        <>
            <NavLink to="/" onClick={onClick}>Home</NavLink>
            <NavLink to="/users" onClick={onClick}>Users</NavLink>
            <NavLink to="/lists" onClick={onClick}>Lists</NavLink>
            <NavLink to="/levels" onClick={onClick}>Levels</NavLink>
        </>
    );

    const profileDropdown = (open: boolean, onLinkClick: () => void) => (
        <div className={`dropdown ${open ? 'open' : ''}`}>
            <NavLink to={`/users/${user?.discord_id}`} onClick={onLinkClick} end>My Profile</NavLink>
            <NavLink to={`/users/${user?.discord_id}/levels`} onClick={onLinkClick}>My Levels</NavLink>
            <NavLink to={`/users//${user?.discord_id}/lists`} onClick={onLinkClick}>My Lists</NavLink>
            <hr />
            <button className="logout-btn" onClick={() => { logout(); onLinkClick(); }}>Logout</button>
        </div>
    );

    const userButton = (open: boolean, onToggle: () => void) => (
        <button className="user-btn" onClick={onToggle}>
            <img src={user?.avatar_url || PlaceHolderLogo} alt="avatar" />
            {user?.username || 'User'}
            <svg className={`chevron ${open ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
            </svg>
        </button>
    );

    const loginButton = (onClick?: () => void) => (
        <a className="login-link" onClick={(e) => { e.preventDefault(); login(window.location.pathname); onClick?.();}}>
            <img src={PlaceHolderLogo} alt="Discord" />
            Login
        </a>
    );

    return (
        <nav className="navbar">
            <a href="/" className="brand">
                <img src={PlaceHolderLogo} alt="Logo" />
                MYODL
            </a>

            <div className="nav-links">
                {navLinks()}
            </div>

            {user ? (
                <div className="user-menu" ref={desktopMenuRef}>
                    {userButton(desktopDropdown, () => setDesktopDropdown(prev => !prev))}
                    {profileDropdown(desktopDropdown, () => setDesktopDropdown(false))}
                </div>
            ) : (
                loginButton()
            )}

            <div className="hamburger" ref={hamburgerRef}>
                <button className={`hamburger-btn ${hamburgerOpen ? 'open' : ''}`} onClick={() => setHamburgerOpen(prev => !prev)}>
                    <span /><span /><span />
                </button>

                <div className={`hamburger-menu ${hamburgerOpen ? 'open' : ''}`}>
                    {user ? (
                        <div className="mobile-user">
                            {userButton(mobileDropdown, () => setMobileDropdown(prev => !prev))}
                            {profileDropdown(mobileDropdown, closeAll)}
                        </div>
                    ) : (
                        loginButton(closeAll)
                    )}
                    <hr className="menu-divider" />
                    {navLinks(closeAll)}
                </div>
            </div>
        </nav>
    );
}