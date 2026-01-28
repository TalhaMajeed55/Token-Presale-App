import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MoralisProvider } from 'react-moralis';
import './index.css';
import { MoralisDappProvider } from './providers/MoralisDappProvider/MoralisDappProvider';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Web3ReactProvider } from '@web3-react/core';
import { ethers } from 'ethers';
import { EventEmitter } from 'events';

// WalletConnect v2 depends on an EventEmitter `off()` method (Node has it, but some browser polyfills don't).
// Patch once, early, so reconnects don't crash with "this.events.off is not a function".
if (typeof EventEmitter?.prototype?.off !== 'function') {
  EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1cac1d',
    },
    neutral: {
      main: '#f8f9f9',
    },
  },
  typography: {
    fontFamily: ['Poppins', 'sans-serif'].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        text: {
          fontWeight: 600,
          textTransform: 'inherit',
        },
        contained: {
          fontWeight: 700,
          textTransform: 'inherit',
          borderRadius: 25,
        },
      },
    },
  },
});

const POLLING_INTERVAL = 12000;

const getLibrary = (provider) => {
  const library = new ethers.BrowserProvider(provider);
  // Best-effort: BrowserProvider doesn't expose pollingInterval like v5 providers.
  try {
    library.pollingInterval = POLLING_INTERVAL;
  } catch {}
  return library;
};

const APP_ID = 'DYFU90AwvC6Ktjxrr31VdJNhAV5UadWBr97duwex';
const SERVER_URL = 'https://gq7x7ofh7pyg.usemoralis.com:2053/server';

const Application = () => {
  return (
    <MoralisProvider appId={APP_ID} serverUrl={SERVER_URL}>
      <Web3ReactProvider getLibrary={getLibrary}>
        <MoralisDappProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
          </ThemeProvider>
        </MoralisDappProvider>
      </Web3ReactProvider>
    </MoralisProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
  <Application />
  // </React.StrictMode>
);
