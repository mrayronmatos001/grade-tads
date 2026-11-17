# Implantação

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão com o Supabase (Transaction pooler, porta 6543) |
| `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE` | Alternativa para um PostgreSQL local |
| `PG_SSL` | `true` para exigir SSL (padrão `true` com `DATABASE_URL`) |
| `PORT` | Porta local do servidor (padrão 3000) |
| `ADMIN_SENHA` | Senha da área `/admin`. Sem ela, a área fica desativada |
| `CONTATO_EMAIL` | Opcional. Substitui os e-mails de contato escritos nos Termos e na Política de Privacidade (separados por vírgula) |

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

### Atualizar um banco que já existe

Quando uma versão nova trouxer um script em `sql/atualizacao_*.sql`, rode-o
no **SQL Editor** do Supabase. Os scripts de atualização podem ser rodados
mais de uma vez sem duplicar dados.

### Ler as sugestões

Pelo site, em **`/admin`**, com a senha definida em `ADMIN_SENHA`. Na Vercel,
crie a variável em **Settings → Environment Variables** e faça um novo deploy
(**Deployments → ⋯ → Redeploy**) para ela passar a valer.

Também dá para ler direto no Supabase, em **Table Editor → sugestao**. Use a coluna `status` para
acompanhar cada mensagem: `NOVA`, `LIDA`, `RESOLVIDA` ou `DESCARTADA`.
Pela Política de Privacidade, as sugestões devem ser apagadas em até 12
meses. Para isso, rode no SQL Editor:

```sql
DELETE FROM sugestao WHERE criado_em < now() - interval '12 months';
```

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
- [ ] Variável `CONTATO_EMAIL` configurada (e-mails exibidos nos Termos de Uso e na Política de Privacidade).
- [ ] Revisão dos documentos legais por um profissional de direito.

## Versão nos arquivos da página

O `index.html`, o `termos.html` e o `privacidade.html` carregam
`style.css?v=X.Y.Z` e `app.js?v=X.Y.Z`. Ao lançar uma versão nova, atualize
esse número junto com o `package.json`: assim os navegadores baixam os
arquivos novos em vez de usar uma cópia antiga guardada em cache.
