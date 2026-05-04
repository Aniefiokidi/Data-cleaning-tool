import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { PipelineProvider } from './context/PipelineContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PipelineProvider>
        <App />
        <Toaster position="top-right" />
      </PipelineProvider>
    </BrowserRouter>
  </StrictMode>,
);
