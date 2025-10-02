import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import UnlockPage from './pages/UnlockPage';
import VaultPage from './pages/VaultPage';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

// Componente para Rotas Protegidas
const ProtectedRoute = () => {
  const token = localStorage.getItem('app_token');
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Rotas Protegidas (só acessíveis após login SSO) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/unlock" element={<UnlockPage />} />
            <Route path="/vault" element={<VaultPage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;