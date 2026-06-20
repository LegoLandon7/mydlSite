import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import List from './pages/List';
import Users from './pages/Users';
import Groups from './pages/Groups';

import NavBar from './components/NavBar';
import Footer from './components/Footer';

import ScrollToTop from './util/ScrollToTop';

import './index.scss';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <NavBar />
      <div className='main-content'>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/list" element={<List />} />
          <Route path="/list/:id" element={<List />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users/:id" element={<Users />} />
          <Route path="/users/:id/list" element={<Users />} />
          <Route path="/users/:id/groups" element={<Users />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:id" element={<Groups />} />
          <Route path="/groups/user/:id" element={<Groups />} />
        </Routes>
      </div>
      <Footer />
    </BrowserRouter>
  </StrictMode>
);