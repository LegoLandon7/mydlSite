import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import List from './pages/List'

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
        </Routes>
      </div>
      <Footer />
    </BrowserRouter>
  </StrictMode>
);