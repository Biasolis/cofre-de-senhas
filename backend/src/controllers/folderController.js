const db = require('../database/db');

// Controller para criar uma nova pasta
const createFolder = async (req, res) => {
  // Agora recebemos também o IV do frontend
  const { encrypted_name, iv } = req.body;
  const userId = req.user.userId;

  if (!encrypted_name || !iv) {
    return res.status(400).json({ message: 'O nome da pasta (criptografado) e o IV são obrigatórios.' });
  }

  try {
    // A query agora insere o IV na nova coluna
    const newFolder = await db.query(
      'INSERT INTO folders (user_id, encrypted_name, iv) VALUES ($1, $2, $3) RETURNING id, created_at',
      [userId, encrypted_name, iv]
    );

    res.status(201).json(newFolder.rows[0]);
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

// Controller para buscar todas as pastas de um usuário
const getFolders = async (req, res) => {
  const userId = req.user.userId;

  try {
    // A query agora também retorna o IV de cada pasta
    const folders = await db.query(
      'SELECT id, encrypted_name, iv FROM folders WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    res.status(200).json(folders.rows);
  } catch (error) {
    console.error('Erro ao buscar pastas:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

module.exports = {
  createFolder,
  getFolders,
};