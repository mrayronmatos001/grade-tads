# Arquitetura

## Visão geral

```
Navegador (public/)  ──HTTP──▶  Servidor Express (server.js)  ──SQL──▶  PostgreSQL (Supabase)
   HTML, CSS, JS                   API em /api/*                        tabelas da grade
   leitura do PDF do histórico      consultas.js + db.js
```

- **Página (`public/`):** HTML, CSS e JavaScript puros, sem framework. Monta a
  pergunta como uma frase com lacunas, desenha as respostas (cadeias, fluxos e
  mapa por período) e lê o PDF do histórico do SIGAA no próprio navegador.
- **Servidor (`server.js`):** Express. Entrega a página e expõe a API. Na
  Vercel, o app é exportado e roda como função; localmente, abre a porta 3000.
- **Banco:** PostgreSQL. Em produção, no Supabase, acessado pelo
  *Transaction pooler*.

## API

| Rota | Método | Retorno |
|---|---|---|
| `/api/consultas` | GET | Perguntas disponíveis e seus campos |
| `/api/opcoes` | GET | Grades, disciplinas (com período e pré-requisitos) e cargas horárias |
| `/api/consulta` | POST | Resposta de uma pergunta: `{ tipo, parametros }` → `{ dados }` |
| `/api/status` | GET | `{ ok: true }` se o banco responde |

Todas as consultas usam parâmetros (`$1`, `$2`…), nunca concatenação de texto,
o que protege contra injeção de SQL.

## Modelo de dados

![Modelo relacional](img/modelo-relacional.jpg)

| Tabela | Conteúdo |
|---|---|
| `curso` | Curso (código, nome, sigla, instituição) |
| `estrutura_curricular` | Cada grade (2015, 2019): ano, créditos optativos, horas complementares |
| `componente` | Catálogo único de disciplinas (código, nome, créditos) |
| `componente_da_estrutura_curricular` | Quais disciplinas estão em cada grade, com natureza e **período** |
| `grupo_de_prerequisito` | Exigências de uma disciplina numa grade |
| `item_do_grupo_de_prerequisito` | Alternativas de cada exigência |

**Regra dos pré-requisitos:** grupos diferentes da mesma disciplina valem como
**E**; itens dentro do mesmo grupo valem como **OU**. Exemplo: Arquitetura de
Software exige *um* grupo com três itens (basta uma das três disciplinas).

A coluna `periodo` foi acrescentada depois do diagrama acima, na tabela
`componente_da_estrutura_curricular`, porque a mesma disciplina pode estar em
períodos diferentes em cada grade.

**Segurança no Supabase:** todas as tabelas têm RLS ativado e nenhuma política,
então a API pública do Supabase não lê nem altera os dados. O servidor acessa o
banco diretamente com o usuário do PostgreSQL.

## Arquivos

| Arquivo | Função |
|---|---|
| `server.js` | Rotas da API e entrega da página |
| `consultas.js` | Consultas SQL e formatação das respostas |
| `db.js` | Pool de conexões com o PostgreSQL |
| `config.js` | Leitura das variáveis de ambiente (`.env`) |
| `sql/banco_completo.sql` | Criação e carga completa do banco |
| `public/index.html`, `app.js`, `style.css` | A página |
| `public/termos.html`, `privacidade.html` | Termos de uso e política de privacidade |
| `.github/workflows/manter-ativo.yml` | Acesso periódico que evita a pausa do Supabase gratuito |
