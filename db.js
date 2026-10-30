// =====================================================================
// Conexão com o PostgreSQL (um pool reaproveitado entre as consultas)
// =====================================================================
const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  ...config.postgres,
  max: 3,                       // poucas conexões: suficiente e amigável a serverless
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
});

async function executar({ texto, valores = [] }) {
  const resultado = await pool.query(texto, valores);
  return resultado.rows;
}

async function status() {
  try {
    await pool.query('SELECT 1');
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

module.exports = { executar, status };
