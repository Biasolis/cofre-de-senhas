import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { JSEncrypt } from 'jsencrypt';
import { useLocation, useNavigate } from 'react-router-dom';

// Importando componentes do MUI
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

const SetupPage = () => {
    const [masterPassword, setMasterPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [ssoData, setSsoData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const sso_id = params.get('sso_id');
        const email = params.get('email');
        if (sso_id && email) {
            setSsoData({ sso_id, email });
        } else {
            setError("Dados do SSO não encontrados. Por favor, reinicie o processo de login.");
        }
    }, [location]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (masterPassword !== confirmPassword) return setError('As senhas não coincidem.');
        if (masterPassword.length < 12) return setError('A senha mestra deve ter no mínimo 12 caracteres.');
        if (!ssoData) return setError("Erro: dados do SSO ausentes.");

        setIsLoading(true);

        try {
            const salt = CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
            const iterations = 100000;
            const hash = CryptoJS.PBKDF2(masterPassword, salt, { keySize: 512 / 32, iterations }).toString(CryptoJS.enc.Hex);
            
            const crypt = new JSEncrypt({ default_key_size: 2048 });
            const privateKey = crypt.getPrivateKey();
            const publicKey = crypt.getPublicKey();

            const privateKeyEncryptionKey = CryptoJS.PBKDF2(masterPassword, salt, { keySize: 256 / 32, iterations });
            const encryptedPrivateKey = CryptoJS.AES.encrypt(privateKey, privateKeyEncryptionKey.toString(CryptoJS.enc.Hex)).toString();

            await axios.post('http://localhost:3001/api/auth/setup', {
                email: ssoData.email,
                sso_id: ssoData.sso_id,
                masterPasswordSalt: salt,
                masterPasswordHash: hash,
                publicKey,
                encryptedPrivateKey,
            });
            
            alert("Conta configurada com sucesso! Por favor, faça o login novamente.");
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao configurar a conta.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
            <Paper elevation={6} sx={{ padding: 4, width: '100%', borderRadius: '12px' }}>
                {!ssoData ? (
                    <Alert severity="error">{error || "Carregando dados..."}</Alert>
                ) : (
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography component="h1" variant="h5" sx={{ textAlign: 'center', fontWeight: 'bold', mb: 1 }}>
                            Configurar Cofre de Senhas
                        </Typography>
                        <Typography color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
                            Bem-vindo(a), <strong>{ssoData.email}</strong>! Crie sua Senha Mestra.
                        </Typography>
                        
                        <Alert severity="warning">
                            <strong>Importante:</strong> Esta senha não pode ser recuperada. Guarde-a com segurança.
                        </Alert>
                        
                        <TextField
                            label="Senha Mestra"
                            type="password"
                            variant="outlined"
                            fullWidth
                            required
                            value={masterPassword}
                            onChange={(e) => setMasterPassword(e.target.value)}
                            helperText="Mínimo de 12 caracteres."
                        />
                        
                        <TextField
                            label="Confirmar Senha Mestra"
                            type="password"
                            variant="outlined"
                            fullWidth
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            error={!!error && masterPassword !== confirmPassword}
                        />

                        {error && (
                            <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>
                        )}

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={isLoading}
                            sx={{ mt: 2, py: 1.5, fontSize: '1rem', textTransform: 'none' }}
                        >
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Criar Cofre'}
                        </Button>
                    </Box>
                )}
            </Paper>
        </Container>
    );
};

export default SetupPage;