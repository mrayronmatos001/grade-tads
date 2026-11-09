# Grade TADS

> **Software proprietário.** Copyright © 2026 Ayron Matos e Heitor Felipe.
> Todos os direitos reservados. É proibido copiar, modificar ou distribuir
> este código sem autorização escrita dos titulares. Veja [`LICENSE`](LICENSE).

**Autores:** Ayron Matos e Heitor Felipe, estudantes de Análise e
Desenvolvimento de Sistemas da UFRN.

Site para consultar a grade curricular do curso de Análise e Desenvolvimento
de Sistemas da UFRN (estruturas 2015 e 2019).

## Funcionalidades

- **Perguntas em forma de frase:** "O que preciso ter cursado para fazer *Projetos Aplicados I* na grade *TADS 2019*?"
- **Pré-requisitos:** cadeia completa até a base, com conexões animadas.
- **O que libera:** fluxo das disciplinas que dependem da escolhida.
- **Grade completa:** mapa por período; passar o mouse mostra o que a disciplina libera,
  o primeiro clique fixa esse fluxo (azul) e o segundo mostra os pré-requisitos (verde).
- **O que posso cursar:** marcação das disciplinas concluídas ou importação do
  histórico do SIGAA em PDF, lido no próprio navegador.
- **Cabeçalho com cargas horárias** obrigatórias, optativas e complementares.
- **Tema claro, escuro ou do sistema.**

## Tecnologias

Node.js e Express no servidor, PostgreSQL (Supabase) como banco, HTML, CSS e
JavaScript puros na página. Hospedagem na Vercel.

## Começando

```
cp .env.example .env    # preencha a conexão com o banco
npm install
npm start
```

Para criar o banco, rode `sql/banco_completo.sql` no PostgreSQL.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | Componentes, API e modelo de dados |
| [`docs/IMPLANTACAO.md`](docs/IMPLANTACAO.md) | Variáveis de ambiente, Supabase, Vercel e checklist de lançamento |
| [`docs/REGISTRO_SOFTWARE.md`](docs/REGISTRO_SOFTWARE.md) | Registro do programa de computador pela AGIR/UFRN |
| [`CHANGELOG.md`](CHANGELOG.md) | Histórico de versões |
| [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) | Licenças de componentes de terceiros |
| `public/termos.html` | Termos de uso (publicados no site) |
| `public/privacidade.html` | Política de privacidade (publicada no site) |

## Aviso

Projeto independente, sem vínculo oficial com a UFRN. As informações
curriculares são apenas informativas e não substituem o SIGAA nem a
orientação da coordenação do curso.
