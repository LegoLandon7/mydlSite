import './NavBar.scss';

import PlaceHolderLogo from '../assets/images/placeholder.png';
import { NavLink, useNavigate } from 'react-router';
import { useState, useRef, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function NavBar() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [username, setUsername] = useState('');
    const [avatar, setAvatar] = useState('');
    const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false);
    const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
    const [hamburgerOpen, setHamburgerOpen] = useState(false);
    const desktopMenuRef = useRef<HTMLDivElement>(null);
    const hamburgerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const checkAuth = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setLoggedIn(true);
                setUsername(data.username || '');
                setAvatar(data.avatar_url || '');
            } else {
                setLoggedIn(false);
                setUsername('');
                setAvatar('');
            }
        } catch {
            setLoggedIn(false);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const loginParam = params.get('login');
        if (loginParam === 'success') {
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (loginParam === 'failed') {
            console.error('Discord login failed');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        checkAuth();
    }, []);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (desktopMenuRef.current && !desktopMenuRef.current.contains(e.target as Node))
                setDesktopDropdownOpen(false);
            if (hamburgerRef.current && !hamburgerRef.current.contains(e.target as Node)) {
                setHamburgerOpen(false);
                setMobileDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const closeAll = () => {
        setHamburgerOpen(false);
        setMobileDropdownOpen(false);
    };

    const handleLogin = () => {
        const redirect = window.location.pathname + window.location.search;
        window.location.href = `${API_URL}/auth/login?redirect=${encodeURIComponent(redirect)}`;
    };

    const handleLogout = async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch {
            console.error('Logout failed');
        } finally {
            setLoggedIn(false);
            setUsername('');
            setAvatar('');
            setDesktopDropdownOpen(false);
            closeAll();
            navigate('/');
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('login') === 'success') {
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(checkAuth, 200);
        } else {
            checkAuth();
        }
    }, []);

    const navLinks = (onClick?: () => void) => (
        <>
            <NavLink to="/" onClick={onClick}>Home</NavLink>
            <NavLink to="/users" onClick={onClick}>Users</NavLink>
            <NavLink to="/groups" onClick={onClick}>Groups</NavLink>
            <NavLink to="/list" onClick={onClick}>Demons List</NavLink>
        </>
    );

    const profileDropdown = (open: boolean, onLinkClick: () => void) => (
        <div className={`dropdown ${open ? 'open' : ''}`}>
            <NavLink to="/personal/list" onClick={onLinkClick}>Personal List</NavLink>
            <NavLink to="/personal/groups" onClick={onLinkClick}>Active Groups</NavLink>
            <hr />
            <button className="logout-btn" onClick={() => { handleLogout(); onLinkClick(); }}>Logout</button>
        </div>
    );

    const userButton = (open: boolean, onToggle: () => void) => (
        <button className="user-btn" onClick={onToggle}>
            <img src={avatar || PlaceHolderLogo} alt="avatar" />
            {username || 'User'}
            <svg className={`chevron ${open ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
            </svg>
        </button>
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

            {loggedIn ? (
                <div className="user-menu" ref={desktopMenuRef}>
                    {userButton(desktopDropdownOpen, () => setDesktopDropdownOpen(prev => !prev))}
                    {profileDropdown(desktopDropdownOpen, () => setDesktopDropdownOpen(false))}
                </div>
            ) : (
                <a className="login-link" onClick={handleLogin}>
                    <img src={PlaceHolderLogo} alt="Discord" />
                    Login
                </a>
            )}

            <div className="hamburger" ref={hamburgerRef}>
                <button className={`hamburger-btn ${hamburgerOpen ? 'open' : ''}`} onClick={() => setHamburgerOpen(prev => !prev)}>
                    <span /><span /><span />
                </button>

                <div className={`hamburger-menu ${hamburgerOpen ? 'open' : ''}`}>
                    {loggedIn ? (
                        <div className="mobile-user">
                            {userButton(mobileDropdownOpen, () => setMobileDropdownOpen(prev => !prev))}
                            {profileDropdown(mobileDropdownOpen, closeAll)}
                        </div>
                    ) : (
                        <a className="login-link" onClick={(e) => { e.preventDefault(); handleLogin(); closeAll(); }}>
                            <img src={PlaceHolderLogo} alt="Discord" />
                            Login
                        </a>
                    )}
                    <hr className="menu-divider" />
                    {navLinks(closeAll)}
                </div>
            </div>
        </nav>
    );
}