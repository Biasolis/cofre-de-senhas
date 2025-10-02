import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { JSEncrypt } from 'jsencrypt';

import { Container, Paper, Typography, TextField, Button, Box, Alert, CircularProgress } from '@mui/material';

// Função para decodificar o payload do JWT
const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};


const UnlockPage = () => {
    const [masterPassword, setMasterPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('app_token');
            if (!token) throw new Error("Token de sessão não encontrado.");

            const decodedToken = parseJwt(token);
            if (!decodedToken || !decodedToken.email) throw new Error("Token inválido.");

            // 1. Buscar o salt do usuário
            const saltResponse = await axios.get(`http://localhost:3001/api/auth/salt/${decodedToken.email}`);
            const { salt } = saltResponse.data;

            // 2. Verificar o hash da senha mestra (simulando a verificação que o backend faria)
            const hash = CryptoJS.PBKDF2(masterPassword, salt, { keySize: 512 / 32, iterations: 100000 }).toString(CryptoJS.enc.Hex);
            // Em uma implementação real, o unlock seria uma chamada de API, mas como a chave não pode sair do cliente,
            // esta validação é mais para a UX. O passo crucial é a descriptografia da chave privada.

            // 3. Buscar os dados do usuário para obter a chave privada criptografada
            const { data: userData } = await axios.get('http://localhost:3001/api/users/me', {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            // 4. Derivar a chave e descriptografar a chave privada
            const privateKeyDecryptionKey = CryptoJS.PBKDF2(masterPassword, salt, { keySize: 256 / 32, iterations: 100000 });
            const privateKey = CryptoJS.AES.decrypt(userData.encrypted_private_key, privateKeyDecryptionKey.toString(CryptoJS.enc.Hex)).toString(CryptoJS.enc.Utf8);
            
            // Teste de descriptografia para validar a senha mestra
            const decryptor = new JSEncrypt();
            decryptor.setPrivateKey(privateKey);
            if (!decryptor.getKey()) {
                throw new Error("Senha Mestra incorreta. Não foi possível carregar a chave privada.");
            }

            // 5. Salvar os dados da sessão que a VaultPage precisará
            const sessionData = {
                token,
                masterPassword,
                salt,
                user: userData,
                privateKey,
            };
            sessionStorage.setItem('sessionData', JSON.stringify(sessionData));
            
            navigate('/vault');

        } catch (err) {
            console.error("Erro ao desbloquear o cofre:", err);
            setError(err.message || "Senha Mestra incorreta ou erro de comunicação.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
            <Paper elevation={6} sx={{ p: 4, width: '100%', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5" sx={{ fontWeight: 'bold' }}>
                    Desbloquear Cofre
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                    Digite sua Senha Mestra para continuar.
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                    <TextField
                        label="Senha Mestra"
                        type="password"
                        variant="outlined"
                        fullWidth
                        required
                        value={masterPassword}
                        onChange={(e) => setMasterPassword(e.target.value)}
                        autoFocus
                    />
                    {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={isLoading}
                        sx={{ mt: 3, py: 1.5 }}
                    >
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Desbloquear'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default UnlockPage;