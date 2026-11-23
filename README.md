# Komanda Frontend

Frontend da plataforma Komanda, construído com Angular, TypeScript e SSR.

## Stack

- **Runtime:** Node.js 20+ LTS
- **Framework:** Angular 21
- **Linguagem:** TypeScript 5.9
- **Renderização:** Angular SSR zoneless
- **Testes:** Vitest
- **Estilos:** SCSS
- **API:** komanda-api
- **Chat:** Socket.IO

## Pré-requisitos

- [Node.js 20+](https://nodejs.org)
- npm
- [komanda-api](https://github.com/komanda-org/komanda-api) em execução

## Configuração inicial

**1. Clone o repositório e instale as dependências**

```bash
npm install
```

**2. Configure a API local**

A aplicação consome a API real em `/api`. Durante o desenvolvimento, o Angular
serve usa o `proxy.conf.json` para encaminhar as requisições:

```text
browser → localhost:4200/api/...  →  NestJS localhost:3000/api/...
```

Não há `pathRewrite`: o prefixo `/api` precisa chegar à API do NestJS.

**3. Suba o backend**

O backend deve estar disponível na porta `3000`. Para os passos completos,
consulte o README do `komanda-api`.

**4. Suba o frontend**

```bash
npm start
```

A aplicação estará disponível em `http://localhost:4200`.

## Ambientes

| Ambiente | Configuração | Origem da API |
|---|---|---|
| Desenvolvimento | `src/environments/environment.ts` | `/api` via proxy local |
| Produção | `src/environments/environment.production.ts` | `/api` via reverse proxy |

Em produção, o frontend e a API devem ficar sob o mesmo domínio ou ser ligados por
um reverse proxy como Nginx, Traefik ou Caddy.

## Comandos

### Aplicação

```bash
npm start                                      # Servidor de desenvolvimento
npm run build                                  # Build de produção com SSR
npm run watch                                  # Build contínuo em desenvolvimento
npm run serve:ssr:komanda-frontend             # Executa o build SSR
```

### Qualidade de código

```bash
npx ng test --watch=false                     # Testes unitários
npx ng build                                  # Build de produção
```

### Angular CLI

```bash
npx ng generate component nome                # Gera um componente
npx ng generate service nome                  # Gera um service
npx ng generate --help                        # Lista os schematics disponíveis
```

## Funcionalidades

- Cadastro e autenticação de profissionais e restaurantes
- Recuperação e redefinição de senha
- Feed e detalhes de vagas
- Candidaturas e acompanhamento de matches
- Perfis de profissionais e restaurantes
- Dashboard e pipeline de vagas para restaurantes
- Criação, edição e visualização de vagas
- Chat em tempo real após candidatura aprovada
- Notificações

## Comunicação com a API

As telas não chamam `HttpClient` diretamente. Elas passam pelos services da
feature, que utilizam URLs relativas em `/api`.

Os erros HTTP são normalizados pelo `api-error.interceptor.ts` no modelo
`ApiError`. O frontend traduz o status em mensagens acionáveis para o usuário.
O `Authorization: Bearer` é aplicado somente pelo `auth.interceptor.ts` em URLs
relativas.

O chat usa o proxy `/socket.io` do ambiente de desenvolvimento e se conecta ao
mesmo backend configurado em `http://localhost:3000`.

## Estrutura do projeto

```text
src/
├── app/
│   ├── core/            # Guards, interceptors, models e services compartilhados
│   ├── features/        # Funcionalidades por domínio
│   ├── layout/          # Layout, navegação e cabeçalho
│   ├── pages/           # Páginas públicas e rotas de aplicação
│   └── shared/          # Componentes e recursos reutilizáveis
├── environments/        # Configuração de desenvolvimento e produção
├── styles/              # Tokens e estilos globais
├── main.ts              # Bootstrap do browser
└── main.server.ts       # Bootstrap do SSR

public/                  # Arquivos estáticos
proxy.conf.json          # Proxy de /api e /socket.io no desenvolvimento
angular.json             # Configuração do Angular CLI
```

## Testes

Os testes unitários usam Vitest com Angular 21. Execute o conjunto principal com:

```bash
npx ng test --watch=false
```

Novos componentes devem incluir um spec correspondente. Chamadas de rede são
feitas contra a API real em `/api`; não devem ser substituídas por mocks.

## Build e SSR

Para gerar a versão de produção:

```bash
npm run build
```

Os arquivos compilados ficam em `dist/`. Para executar o resultado do build:

```bash
npm run serve:ssr:komanda-frontend
```