const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('connect', () => {
  console.log('Conectado ao PostgreSQL com sucesso!');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  // Exportamos uma função para obter um cliente do pool para transações
  getClient: () => pool.connect(),
};