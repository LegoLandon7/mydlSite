import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.scss';

import NavBar from './components/NavBar.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <NavBar
        links={[
          { name: "Home", link: "/" },
          { name: "About", link: "/about" },
          { name: "Socials", link: "/socials" }
        ]}
      />
    </BrowserRouter>
  </StrictMode>
);