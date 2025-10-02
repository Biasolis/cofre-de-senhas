const db = require('../database/db');

const createGroup = async (req, res) => {
  const { name, encrypted_group_key } = req.body;
  const ownerId = req.user.userId;
  if (!name || !encrypted_group_key) {
    return res.status(400).json({ message: 'Nome do grupo e chave criptografada são obrigatórios.' });
  }
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const groupResult = await client.query('INSERT INTO groups (name, owner_id) VALUES ($1, $2) RETURNING id', [name, ownerId]);
    const groupId = groupResult.rows[0].id;
    await client.query('INSERT INTO user_groups (user_id, group_id, encrypted_group_key) VALUES ($1, $2, $3)', [ownerId, groupId, encrypted_group_key]);
    await client.query('COMMIT');
    res.status(201).json({ id: groupId, name, message: 'Grupo criado com sucesso.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar grupo:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  } finally {
    client.release();
  }
};

const getGroups = async (req, res) => {
    const userId = req.user.userId;
    try {
        const result = await db.query(
            `SELECT g.id, g.name, g.owner_id FROM groups g JOIN user_groups ug ON g.id = ug.group_id WHERE ug.user_id = $1`, [userId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar grupos:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// NOVO: Controller para adicionar um usuário a um grupo
const addUserToGroup = async (req, res) => {
    const { groupId } = req.params;
    const { userIdToAdd, encrypted_group_key } = req.body;
    const requesterId = req.user.userId;

    try {
        // 1. Verificar se quem está adicionando é o dono do grupo
        const groupResult = await db.query('SELECT owner_id FROM groups WHERE id = $1', [groupId]);
        if (groupResult.rows.length === 0) {
            return res.status(404).json({ message: 'Grupo não encontrado.' });
        }
        if (groupResult.rows[0].owner_id !== requesterId) {
            return res.status(403).json({ message: 'Apenas o dono do grupo pode adicionar membros.' });
        }

        // 2. Adicionar o novo membro
        await db.query(
            'INSERT INTO user_groups (user_id, group_id, encrypted_group_key) VALUES ($1, $2, $3)',
            [userIdToAdd, groupId, encrypted_group_key]
        );

        res.status(200).json({ message: 'Usuário adicionado ao grupo com sucesso.' });
    } catch (error) {
        // Trata erro de usuário já existente no grupo (unique constraint)
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Este usuário já é membro do grupo.' });
        }
        console.error('Erro ao adicionar usuário ao grupo:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// NOVO: Controller para buscar a chave de grupo criptografada para o usuário atual
const getMyGroupKey = async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.userId;
    try {
        const result = await db.query(
            'SELECT encrypted_group_key FROM user_groups WHERE user_id = $1 AND group_id = $2',
            [userId, groupId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Chave não encontrada. Você não é membro deste grupo.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar chave do grupo:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

module.exports = {
  createGroup,
  getGroups,
  addUserToGroup,
  getMyGroupKey,
};