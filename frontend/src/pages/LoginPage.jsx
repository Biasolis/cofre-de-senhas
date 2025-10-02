import React from 'react';
import axios from 'axios';

// Importando componentes do MUI
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

const LoginPage = () => {
    const handleLogin = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/auth/sso/login');
            const { redirectUrl } = response.data;
            window.location.href = redirectUrl;
        } catch (error) {
            console.error("Erro ao iniciar o login SSO", error);
            alert("Não foi possível iniciar o processo de login. Verifique o console.");
        }
    };

    return (
        <Container 
            component="main" 
            maxWidth="xs"
            // sx é uma prop para estilização customizada
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
            }}
        >
            <Paper 
                elevation={6}
                sx={{
                    padding: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    borderRadius: '12px',
                }}
            >
                <Typography component="h1" variant="h5" sx={{ fontWeight: 'bold' }}>
                    Cofre de Senhas
                </Typography>
                <Typography component="p" color="text.secondary" sx={{ mt: 1, mb: 4 }}>
                    Segurança e praticidade para suas credenciais.
                </Typography>
                
                <Button
                    onClick={handleLogin}
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<VpnKeyIcon />}
                    sx={{ 
                        paddingY: 1.5, 
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        textTransform: 'none',
                    }}
                >
                    Entrar com SSO
                </Button>
            </Paper>
        </Container>
    );
};

export default LoginPage;