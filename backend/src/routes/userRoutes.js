const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { findUserByEmail, getMe } = require('../controllers/userController');

// Protege todas as rotas
router.use(authMiddleware);

// Rota para buscar outros usuários
router.get('/find', findUserByEmail);

// NOVO: Rota para buscar os dados do próprio usuário logado
router.get('/me', getMe);

module.exports = router;