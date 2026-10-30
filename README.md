# Grade curricular TADS/UFRN

Site para consultar a grade curricular do TADS (estruturas 2015 e 2019):
pré-requisitos, o que cada disciplina libera, grade completa por período
e o que você já pode cursar (com importação do histórico do SIGAA).

**Tecnologias:** Node.js + Express no servidor, PostgreSQL como banco,
HTML/CSS/JS puro na página.

## Estrutura

| Arquivo | Função |
|---|---|
| `server.js` | Servidor e API (`/api/consulta`, `/api/opcoes`, `/api/status`) |
| `consultas.js` | As consultas em SQL |
| `db.js` | Conexão com o PostgreSQL |
| `config.js` | Lê a configuração do `.env` |
| `sql/banco_completo.sql` | Cria e popula o banco |
| `public/` | A página |
| `.github/workflows/manter-ativo.yml` | Evita a pausa do Supabase gratuito |

## Rodar no computador

1. Crie o banco: rode `sql/banco_completo.sql` no pgAdmin (Query Tool).
2. Copie `.env.example` para `.env` e preencha usuário, senha, porta e banco.
3. No terminal, na pasta do projeto:
   ```
   npm install
   npm start
   ```
4. Abra http://localhost:3000

## Publicar (Supabase + Vercel, gratuito)

Veja o passo a passo completo nas instruções do projeto.
