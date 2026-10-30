// =====================================================================
// Configuração. Os valores vêm de variáveis de ambiente:
//   - no seu computador, do arquivo .env (copie o .env.example);
//   - na Vercel, das "Environment Variables" do projeto.
// O próprio Node lê o .env (process.loadEnvFile), sem pacote extra.
// =====================================================================
try {
  process.loadEnvFile();
} catch {
  // sem arquivo .env: tudo bem, as variáveis vêm do ambiente (ex.: Vercel)
}

const ligado = (v) => ['1', 'true', 'sim', 'yes'].includes(String(v || '').toLowerCase());

module.exports = {
  porta: Number(process.env.PORT || 3000),

  postgres: process.env.DATABASE_URL
    ? {
        // formato do Supabase: postgresql://usuario:senha@host:porta/banco
        connectionString: process.env.DATABASE_URL,
        ssl: ligado(process.env.PG_SSL ?? 'true') ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.PG_HOST || '127.0.0.1',
        port: Number(process.env.PG_PORT || 5432),
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || '',
        database: process.env.PG_DATABASE || 'estrutura_curricular',
        ssl: ligado(process.env.PG_SSL) ? { rejectUnauthorized: false } : false,
      },
};
