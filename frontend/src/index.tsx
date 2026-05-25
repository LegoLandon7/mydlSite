import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.scss';

import NavBar from './components/NavBar.tsx';
import Home from './pages/Home.tsx';
import Dashboard from './pages/Dashboard.tsx';
import GroupDetail from './pages/GroupDetail.tsx';
import MyList from './pages/MyList.tsx';
import AdminPanel from './pages/AdminPanel.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <NavBar
        links={[
          { name: "Home", link: "/" },
          { name: "Dashboard", link: "/dashboard" },
          { name: "My Lists", link: "/lists" }
        ]}
      />
      <div className='main-content'>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/group/:groupId" element={<GroupDetail />} />
          <Route path="/lists" element={<MyList />} />
          <Route path="/admin/:groupId" element={<AdminPanel />} />
        </Routes>
      </div>
    </BrowserRouter>
  </StrictMode>
);