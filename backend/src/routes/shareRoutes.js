const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createShare, getSharedSecrets } = require('../controllers/shareController');

// Protege todas as rotas
router.use(authMiddleware);

// Rota para criar um novo compartilhamento
router.post('/', createShare);

// Rota para buscar os segredos compartilhados com o usuário logado
router.get('/', getSharedSecrets);

module.exports = router;