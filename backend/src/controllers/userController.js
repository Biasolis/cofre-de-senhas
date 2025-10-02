const db = require('../database/db');

// Controller para encontrar um usuário pelo email
const findUserByEmail = async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ message: 'O email é obrigatório para a busca.' });
  }
  try {
    const result = await db.query(
      'SELECT id, email, public_key FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Nenhum usuário encontrado com este email.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

// NOVO: Controller para buscar os dados do usuário logado
const getMe = async (req, res) => {
    const userId = req.user.userId;
    try {
        const result = await db.query(
            'SELECT id, email, public_key, encrypted_private_key FROM users WHERE id = $1',
            [userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

module.exports = {
  findUserByEmail,
  getMe,
};