const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createSecret, getSecrets, getSecretById } = require('../controllers/secretController');

router.use(authMiddleware);

router.get('/', getSecrets);
router.post('/', createSecret);

// NOVO: Rota para buscar um segredo específico
router.get('/:secretId', getSecretById);

module.exports = router;