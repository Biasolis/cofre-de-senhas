const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createGroup, getGroups, addUserToGroup, getMyGroupKey } = require('../controllers/groupController');

router.use(authMiddleware);

router.post('/', createGroup);
router.get('/', getGroups);

// NOVAS ROTAS
router.get('/:groupId/mykey', getMyGroupKey); // Pega a chave do grupo para o usuário logado
router.post('/:groupId/members', addUserToGroup); // Adiciona um novo membro

module.exports = router;