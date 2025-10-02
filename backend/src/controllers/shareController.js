const db = require('../database/db');

// Controller para criar um novo compartilhamento
const createShare = async (req, res) => {
    const { original_secret_id, group_id, encrypted_data, iv } = req.body;
    const shared_by_user_id = req.user.userId;

    if (!original_secret_id || !group_id || !encrypted_data || !iv) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    try {
        // TODO: Adicionar verificação para garantir que o usuário é membro do grupo
        // e que o segredo original pertence a ele.

        const newShare = await db.query(
            `INSERT INTO secret_shares (original_secret_id, group_id, encrypted_data, iv, shared_by_user_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, created_at`,
            [original_secret_id, group_id, encrypted_data, iv, shared_by_user_id]
        );

        res.status(201).json(newShare.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Este segredo já foi compartilhado com este grupo.' });
        }
        console.error('Erro ao compartilhar segredo:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// Controller para buscar segredos compartilhados com o usuário logado
const getSharedSecrets = async (req, res) => {
    const userId = req.user.userId;
    try {
        // Esta query busca todos os 'secret_shares' de todos os grupos
        // dos quais o usuário atual é membro.
        const result = await db.query(
            `SELECT ss.id, ss.group_id, ss.encrypted_data, ss.iv, ss.shared_by_user_id, ss.created_at
             FROM secret_shares ss
             JOIN user_groups ug ON ss.group_id = ug.group_id
             WHERE ug.user_id = $1`,
            [userId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar segredos compartilhados:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

module.exports = {
    createShare,
    getSharedSecrets,
};