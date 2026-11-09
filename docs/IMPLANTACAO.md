# Implantação

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão com o Supabase (Transaction pooler, porta 6543) |
| `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE` | Alternativa para um PostgreSQL local |
| `PG_SSL` | `true` para exigir SSL (padrão `true` com `DATABASE_URL`) |
| `PORT` | Porta local do servidor (padrão 3000) |

Localmente, copie `.env.example` para `.env`. O `.env` nunca deve ir para o
repositório (já está no `.gitignore`).

## Rodar localmente

```
npm install
npm start
```

Acesse http://localhost:3000.

## Banco no Supabase

1. Crie um projeto. Nas opções de segurança, desative a Data API e ative o RLS automático.
2. No **SQL Editor**, rode `sql/banco_completo.sql`.
3. Em **Connect → Direct → Transaction pooler**, copie a URI e substitua
   `[YOUR-PASSWORD]` pela senha do banco. Caracteres especiais da senha
   precisam ser codificados (`#` → `%23`, `@` → `%40`).

## Publicação na Vercel

1. Importe o repositório do GitHub em **Add New → Project**.
2. Em **Environment Variables**, crie `DATABASE_URL`.
3. Clique em **Deploy**. Cada `git push` na branch `main` publica uma nova versão.
4. Teste em `https://SEU-SITE.vercel.app/api/status` (deve retornar `{"ok":true}`).

## Evitar a pausa do Supabase gratuito

O plano gratuito pausa projetos após 7 dias sem acesso ao banco. O workflow
`.github/workflows/manter-ativo.yml` acessa `/api/status` a cada 3 dias.

1. No GitHub: **Settings → Secrets and variables → Actions → Variables**.
2. Crie a variável `SITE_URL` com o endereço do site, sem barra no final.
3. Em **Actions → Manter o banco ativo → Run workflow**, teste a execução.

## Checklist de lançamento comercial

- [ ] Conversar com a AGIR/UFRN sobre o registro e a titularidade (veja `docs/REGISTRO_SOFTWARE.md`).
      Se a UFRN for a titular, o licenciamento a terceiros passa a ser feito pela universidade.
- [ ] Repositório do GitHub **privado** (o código de um software proprietário não deve ficar público).
- [ ] Plano de hospedagem compatível com uso comercial: o plano Hobby da Vercel é
      destinado a uso pessoal e não comercial; para fins comerciais, use o plano Pro.
- [ ] Autorização da UFRN para uso do logotipo do TADS/UFRN, ou substituição por uma marca própria.
- [ ] Contato do titular preenchido nos Termos de Uso e na Política de Privacidade.
- [ ] Revisão dos documentos legais por um profissional de direito.
