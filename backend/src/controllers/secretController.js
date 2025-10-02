const db = require('../database/db');

const createSecret = async (req, res) => {
  const { type, folder_id, encrypted_title, encrypted_username, encrypted_password, encrypted_url, encrypted_notes, iv } = req.body;
  const userId = req.user.userId;
  if (!encrypted_title || !iv) {
    return res.status(400).json({ message: 'Título criptografado e IV são obrigatórios.' });
  }
  try {
    const newSecret = await db.query(
      `INSERT INTO secrets (user_id, folder_id, type, encrypted_title, encrypted_username, encrypted_password, encrypted_url, encrypted_notes, iv)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, type, created_at`,
      [userId, folder_id || null, type || 'login', encrypted_title, encrypted_username, encrypted_password, encrypted_url, encrypted_notes, iv]
    );
    res.status(201).json(newSecret.rows[0]);
  } catch (error) {
    console.error('Erro ao criar segredo:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

const getSecrets = async (req, res) => {
  const userId = req.user.userId;
  try {
    const secrets = await db.query(
      'SELECT id, folder_id, type, encrypted_title, encrypted_username, encrypted_password, encrypted_url, encrypted_notes, iv, created_at FROM secrets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.status(200).json(secrets.rows);
  } catch (error) {
    console.error('Erro ao buscar segredos:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

// NOVO: Controller para buscar um único segredo pelo ID
const getSecretById = async (req, res) => {
    const userId = req.user.userId;
    const { secretId } = req.params;
    try {
        const result = await db.query(
            'SELECT * FROM secrets WHERE id = $1 AND user_id = $2',
            [secretId, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Segredo não encontrado ou não pertence a você.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar segredo por ID:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

module.exports = {
  createSecret,
  getSecrets,
  getSecretById, // Exporta a nova função
};