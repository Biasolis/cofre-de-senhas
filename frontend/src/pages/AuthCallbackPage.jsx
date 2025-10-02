import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';

const AuthCallbackPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');

        if (token) {
            localStorage.setItem('app_token', token);
            // Redireciona para a página de DESBLOQUEIO.
            navigate('/unlock');
        } else {
            console.error("Nenhum token encontrado no callback.");
            navigate('/');
        }
    }, [location, navigate]);

    return (
        <Box 
            sx={{
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100vh'
            }}
        >
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6">Autenticando...</Typography>
            <Typography color="text.secondary">Você será redirecionado em breve.</Typography>
        </Box>
    );
};

export default AuthCallbackPage;