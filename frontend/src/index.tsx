import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/Home';
import Levels from './pages/Levels';
import Users from './pages/Users';
import Lists from './pages/Lists';

import NavBar from './components/web/NavBar';
import Footer from './components/web/Footer';
import ScrollToTop from './util/ScrollToTop';
import AuthInit from './api/call/auth/AuthInit';
import Toast from './components/ui/Toast';

import './index.scss';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthInit>
                <ScrollToTop />
                <Toast />
                <NavBar />
                <div className="main-content">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/levels" element={<Levels />} />
                        <Route path="/levels/:id" element={<Levels />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="/users/:id" element={<Navigate to="details" replace />} />
                        <Route path="/users/:id/:tab" element={<Users />} />
                        <Route path="/lists" element={<Lists />} />
                        <Route path="/lists/:id" element={<Lists />} />
                    </Routes>
                </div>
                <Footer />
            </AuthInit>
        </BrowserRouter>
    </StrictMode>
);