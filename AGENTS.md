# AGENTS.md

Guia de boas praticas para quem mexe neste repositorio (pessoa ou agente).
As regras valem para codigo novo e para alteracoes em codigo existente.

## 1. Nomes: ingles para o que o usuario final nao ve

Todo identificador que existe so para a maquina ou para quem programa fica em
ingles, em kebab-case quando for arquivo/pasta:

- arquivos e pastas (`auth.service.ts`, `registro-profissional/`);
- variaveis, funcoes, classes, metodos, interfaces (`isLoading`, `submitForm`, `Sessao`... -> usar `isLoading`, `session`);
- rotas, chaves de localStorage, seletor CSS do componente, ids de elemento;
- nomes de teste (`describe`/`it`) e de constante interna.

Excecao — fica em portugues com acento tudo que o usuario ve na tela: rotulos,
mensagens de erro, placeholder, botao, texto de apoio.

Observacao: o codigo legado tem identificadores em portugues (`entrar()`,
`sessao`, `moldura`). Nao fazer rename em massa; o padrao vale para nomes novos
e para renomes que ja estiverem acontecendo.

## 2. Comentarios: so o necessario

- Comentar so o "porquê" que nao da para ler no codigo (regra do back-end,
  armadilha de SSR, truque de acessibilidade, limitacao de API).
- No maximo 1-3 linhas por comentario. Nada de ensaio, historia da task,
  resumo do que a linha faz ou repetir o nome do metodo em frases.
- Nada de codigo comentado em bloqueio: se nao roda, sai do arquivo (excecao
  unica: um `TODO API` curto dizendo o que falta no back-end).
- Linguagem: portugues sem acento. `TODO:` com responsavel claro.
- Antes de commitar, releia os comentarios que escreveu e apague os que não
  sobreviveriam ao teste "alguem apagou isto e ninguem sentiu falta?".

## 3. Texto visivel (UI)

- Portugues com acento, frases que a pessoa consegue agir sobre
  ("E-mail ou senha incorretos.", nao "Erro 401").
- Nunca mostrar status HTTP, stack trace ou nome de endpoint para o usuario.

## 4. Stack e testes

- Angular 21 zoneless + SSR: sem `fakeAsync`/`tick`; teste usa `vi`,
  `describe`, `it`, `expect` globais. `localStorage` nao existe no servidor —
  qualquer acesso passa por `isPlatformBrowser`.
- Componente novo = spec novo. `npx ng test --watch=false` tem de ficar verde,
  e `npx ng build` sem erro, antes de commitar.
- Sem mock: chamadas de rede vao na API real (`/api`, ver `proxy.conf.json`).

## 5. HTTP

- Tela nunca chama `HttpClient` direto: passa pelo service da feature.
- Erro chega normalizado em `ApiError` (ver `api-error.interceptor.ts`, o unico
  registrado em `app.config.ts`); checar com `isApiError` e traduzir `status` em
  frase acionavel na tela, em `switch` de status explicito. `ErroApi`/`ehErroApi`
  sao legado e nao batem com o erro que chega.
- `Authorization: Bearer` vem so do `auth.interceptor.ts` e so em URL relativa.

## 6. Git

- Nao commitar com teste vermelho (o hook local bloqueia).
- Uma task = um commit, mensagem no imperativo, em ingles
  (`feat: ...`, `fix: ...`, `test: ...`).
- Nao commitar `dist/`, screenshots temporarios nem arquivos de /tmp.
