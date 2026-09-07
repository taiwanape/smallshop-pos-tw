import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import PublicShowcase from '../components/public-showcase';
import '../app/globals.css';
import './showcase.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Missing root element');
}

createRoot(root).render(
  <StrictMode>
    <PublicShowcase />
  </StrictMode>,
);
