import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Toaster } from '@/components/ui/Toaster';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <TooltipProvider delayDuration={200}>
        <App />
        <Toaster />
      </TooltipProvider>
    </ErrorBoundary>
  </StrictMode>,
);
