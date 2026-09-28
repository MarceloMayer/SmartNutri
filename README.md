# SmartNutri

Plataforma para nutricionistas gerenciarem pacientes, planos alimentares, avaliações físicas, refeições e substituições de alimentos.

O projeto é um monorepo npm com duas aplicações:

- `apps/web`: aplicação web em Angular.
- `apps/api`: API REST em Fastify, TypeScript e MySQL.

## Recursos

- Autenticação e controle de acesso para nutricionistas e pacientes.
- Cadastro e acompanhamento de pacientes.
- Planos alimentares, refeições e substituições de alimentos.
- Avaliações físicas, evolução corporal e anexos.
- Catálogo de alimentos baseado na tabela TACO.
- Recuperação de senha por e-mail.

## Pré-requisitos

- Node.js 18 ou superior
- npm 9 ou superior
- MySQL 8 ou compatível

## Como executar

1. Instale as dependências na raiz do projeto:

   ```bash
   npm install
   ```

2. Crie a configuração local da API:

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

3. Ajuste em `apps/api/.env` as credenciais do MySQL e, se necessário, a chave da Resend e a origem permitida pelo CORS.

4. Execute as migrações:

   ```bash
   npm run migrate:api
   ```

5. Em terminais separados, inicie a API e a interface:

   ```bash
   npm run dev:api
   npm run dev:web
   ```

A API fica disponível por padrão em `http://localhost:3333` e a aplicação web em `http://localhost:4200`.

## Scripts

```bash
npm run build          # gera as builds dos workspaces
npm run typecheck      # verifica os tipos
npm run migrate:api    # executa migrações do banco
npm run import:taco    # importa a base TACO
```

## Segurança

Não versione `apps/api/.env`. Use somente `apps/api/.env.example` como referência e mantenha chaves, senhas e tokens apenas no ambiente local ou no seu provedor de deploy.
