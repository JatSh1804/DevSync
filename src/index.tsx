import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import './index.css';
import { ThemeProvider } from './lib/theme-provider.js';


createRoot(document.getElementById('root')).render(
    <ThemeProvider>
        <App />
    </ThemeProvider>
);