const express = require('express');
const router = express.Router();
const { setupAccount } = require('../controllers/authController');
const { redirectToSso, handleSsoCallback } = require('../controllers/ssoController'); // Importamos o novo controller

// --- ROTAS ANTIGAS ---
// Mantemos a rota de setup para o primeiro login via SSO
router.post('/setup', setupAccount);
// As rotas /salt e /unlock não são mais o ponto de entrada principal e podem ser removidas ou adaptadas depois.

// --- NOVAS ROTAS DE SSO ---
// O frontend chamará esta rota para obter a URL de login do SSO
router.get('/sso/login', redirectToSso);

// Esta é a nossa Redirect URI que o SSO chamará
router.get('/sso/callback', handleSsoCallback);

module.exports = router;