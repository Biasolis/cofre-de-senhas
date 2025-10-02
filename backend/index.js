require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./src/database/db');

const authRoutes = require('./src/routes/authRoutes');
const secretRoutes = require('./src/routes/secretRoutes');
const folderRoutes = require('./src/routes/folderRoutes');
const userRoutes = require('./src/routes/userRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const shareRoutes = require('./src/routes/shareRoutes'); // IMPORTAMOS

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de teste
app.get('/api/health', async (req, res) => {
  try {
    const time = await db.query('SELECT NOW()');
    res.status(200).json({ status: 'ok', message: 'API está funcionando.', dbTime: time.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Erro na API ou no banco de dados.' });
  }
});

// Rotas da Aplicação
app.use('/api/auth', authRoutes);
app.use('/api/secrets', secretRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/shares', shareRoutes); // USAMOS

app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});