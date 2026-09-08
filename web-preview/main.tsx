import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import SuiteApp from './suite-app';
import '../app/globals.css';
import '../app/suite.css';
import '../app/neo.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Missing root element');
}

createRoot(root).render(
  <StrictMode>
    <SuiteApp />
  </StrictMode>,
);
