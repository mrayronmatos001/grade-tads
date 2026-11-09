# Registro do programa de computador

O software já é protegido pela Lei nº 9.609/1998 desde a sua criação, mesmo
sem registro. O registro no INPI serve como prova de autoria e de
titularidade, e é a base para licenciar o uso a terceiros e receber
royalties.

## Dois caminhos possíveis

| | Pela UFRN (AGIR) | Pelos próprios autores |
|---|---|---|
| Quem pede o registro | A Agência de Inovação da UFRN | Os autores, como pessoas físicas, direto no INPI |
| Titular (dono dos direitos patrimoniais) | Em geral, a UFRN | Os autores |
| Autores no certificado | Ayron Matos e Heitor Felipe | Ayron Matos e Heitor Felipe |
| Licenciamento a terceiros | Negociado pela UFRN | Negociado pelos autores |
| Ganhos para os autores | Participação nos ganhos da UFRN, garantida pela Lei nº 10.973/2004 (entre 5% e 1/3) | Todo o valor negociado |
| Custos e trâmites | Conduzidos pela universidade | Taxa do INPI e trâmites por conta dos autores |

Como o software nasceu de uma atividade do curso, a AGIR é quem avalia se há
titularidade da UFRN. Por isso, o primeiro passo recomendado é conversar com
a agência antes de qualquer registro individual.

**Contato:** Agência de Inovação da UFRN (AGIR), Campus Universitário,
Lagoa Nova, Natal/RN. Site: agir.ufrn.br

## Informações para levar à AGIR

**Sobre o programa**
- **Título:** Grade TADS
- **Versão:** a do `package.json` no momento do pedido
- **Data de criação:** data da primeira versão funcional (outubro de 2026)
- **Descrição:** sistema web para consulta da grade curricular do curso de
  Análise e Desenvolvimento de Sistemas da UFRN: pré-requisitos, disciplinas
  liberadas, grade por período e simulação do que o estudante pode cursar,
  com importação do histórico escolar do SIGAA processada no navegador.
- **Linguagens:** JavaScript (Node.js), SQL (PostgreSQL), HTML e CSS
- **Campo de aplicação:** educação; gestão acadêmica
- **Tipo de programa:** aplicação web (cliente e servidor)
- **Derivação:** não é derivado de outro programa registrado
- **Contexto:** desenvolvido como trabalho da disciplina de Banco de Dados,
  com orientação do professor da disciplina

**Sobre os autores** (de cada um)
- Nome completo, CPF, endereço, e-mail e matrícula na UFRN
- Percentual de participação de cada autor na criação (ex.: 50% e 50%)

**Documentação técnica**
- `docs/ARQUITETURA.md` (inclui o modelo relacional)
- `README.md`
- O código-fonte completo da versão a registrar

## Resumo digital (hash) do código-fonte

O INPI não recebe o código em si: o pedido leva um **resumo digital (hash)**
do código-fonte, que prova qual versão foi registrada. A AGIR orienta o
formato exato. Para gerar, compacte o código da versão (sem `node_modules`
e sem `.env`) e calcule o hash. No PowerShell:

```
Compress-Archive -Path server.js,consultas.js,db.js,config.js,package.json,public,sql -DestinationPath grade-tads-codigo.zip
Get-FileHash grade-tads-codigo.zip -Algorithm SHA512
```

**Guarde o arquivo `.zip` exatamente como foi usado para gerar o hash.**
Qualquer alteração, mesmo de um espaço, muda o resumo, e é esse arquivo que
comprova a autoria em caso de disputa.

## Depois do registro

- Atualize o `LICENSE`, o `README.md` e o rodapé do site com o titular
  registrado e o número do registro no INPI.
- Novas versões com mudanças relevantes podem exigir um novo registro.
