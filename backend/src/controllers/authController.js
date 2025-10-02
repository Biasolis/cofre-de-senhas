const db = require('../database/db');
const jwt = require('jsonwebtoken');

const setupAccount = async (req, res) => {
  // Adicionamos os novos campos vindos do body
  const { 
    email, sso_id, masterPasswordSalt, masterPasswordHash, masterPasswordHint,
    publicKey, encryptedPrivateKey 
  } = req.body;

  // Atualizamos a validação
  if (!email || !sso_id || !masterPasswordSalt || !masterPasswordHash || !publicKey || !encryptedPrivateKey) {
    return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }

  try {
    const existingUser = await db.query('SELECT * FROM users WHERE email = $1 OR sso_id = $2', [email, sso_id]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Usuário já cadastrado no sistema.' });
    }

    // Atualizamos a query de inserção para incluir as novas colunas
    const newUser = await db.query(
      `INSERT INTO users (email, sso_id, master_password_salt, master_password_hash, master_password_hint, public_key, encrypted_private_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, created_at`,
      [email, sso_id, masterPasswordSalt, masterPasswordHash, masterPasswordHint, publicKey, encryptedPrivateKey]
    );

    res.status(201).json({
      message: 'Conta configurada com sucesso!',
      user: newUser.rows[0],
    });

  } catch (error) {
    console.error('Erro ao configurar a conta:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

const getUserSalt = async (req, res) => {
  try {
    const { email } = req.params;
    const result = await db.query('SELECT master_password_salt FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
    res.status(200).json({ salt: result.rows[0].master_password_salt });
  } catch (error) {
    console.error('Erro ao buscar salt:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

const unlockVault = async (req, res) => {
  try {
    const { email, masterPasswordHash } = req.body;
    if (!email || !masterPasswordHash) return res.status(400).json({ message: 'Email e hash da senha são obrigatórios.' });

    const result = await db.query('SELECT id, master_password_hash FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const user = result.rows[0];
    const isMatch = user.master_password_hash === masterPasswordHash;
    if (!isMatch) return res.status(401).json({ message: 'Senha mestra incorreta.' });

    const payload = { userId: user.id, email: email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.status(200).json({ message: 'Cofre desbloqueado com sucesso!', token: token });
  } catch (error) {
    console.error('Erro ao desbloquear o cofre:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

module.exports = {
  setupAccount,
  getUserSalt,
  unlockVault,
};