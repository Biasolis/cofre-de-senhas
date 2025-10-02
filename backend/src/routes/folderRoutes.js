const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createFolder, getFolders } = require('../controllers/folderController');

// Protege todas as rotas de pastas com o middleware de autenticação

// Rota para buscar todas as pastas do usuário logado
router.get('/', authMiddleware, getFolders);

// Rota para criar uma nova pasta
router.post('/', authMiddleware, createFolder);

module.exports = router;