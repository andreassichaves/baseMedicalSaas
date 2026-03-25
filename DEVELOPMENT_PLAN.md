# Portal SaaS Multi-Produto — Plano de Desenvolvimento

## Resumo do Projeto

**Produto:** Portal SaaS multi-produto com billing unificado.
**SaaS #1:** Inventario de Equipamentos com gestao de manutencoes.
**Modelo de receita:** Assinatura mensal de R$600/cliente.
**Stack:** Next.js + Supabase + Node.js billing service + Asaas.
**Timeline estimada:** 16 semanas para MVP lancavel.

**Documento:** este arquivo e a fonte oficial do roteiro. O **planejado x executado** fica na secao [Etapas de desenvolvimento (visao geral)](#etapas-de-desenvolvimento-visao-geral); as tarefas detalhadas ficam nas secoes de cada fase.

---

## Etapas de desenvolvimento (visao geral)

<span id="etapas-de-desenvolvimento-visao-geral"></span>

### Planejado x executado (Marco 2026)

**Atualize** a data no titulo e as tabelas quando um milestone for concluido. **Ultima revisao:** Mar 2026 — **Fase 0 fechada:** Supabase hosted (`link` + migrations **001–010**), env Asaas/webhook alinhados, **smoke test local** OK (`turbo dev` / web **:3000**, billing **:4000**). **Opcional ainda:** `git push` de commits pendentes; CI em Actions. Fase 1 — hook JWT **validado em hosted** (claims `org_id` e `portal_role` no access token).

**Executado (ja no monorepo)**

| Fase | O que ja existe |
|------|-----------------|
| **0 — Setup** | Workspaces npm + **Turbo** (`dev`, `dev:web`, `dev:billing`); `apps/web` (Next.js App Router, Tailwind, UI base); `apps/billing-service` (Express) + **Dockerfile**; `packages/shared`; `docker-compose.yml`; pasta `supabase/` com **migrations** e CLI; exemplos de env no billing (`.env.example`). **Hosted:** `supabase link` + **`db push`** (ou SQL Editor) — historico alinhado; migrations **001–010** no remoto. **Validado localmente:** `npm run dev` / `turbo dev` — web **:3000**, billing **:4000** (+ `/health`). **Opcional:** sincronizar commits com `origin`; **CI** (Actions) quando conveniente. |
| **1 — Auth + portal** | Migrations **001–003** + **010** (`custom_access_token_hook`). **Registro** (`/register` + API), **login**, **esqueci senha**. **Middleware** do portal. Layout, **dashboard**, catalogo; publico (**/**, `/pricing`, `/features`). Hook **local** (`config.toml`) e **hosted** (Dashboard `/auth/hooks` + SQL aplicado); JWT do utilizador inclui **`org_id`** e **`portal_role`** (confirmado no fluxo de login). |
| **2 — RBAC** | Migration **004** + **008/009**. **`usePermissions`**, **`PermissionGate`**. **`/settings`**, **`/settings/users`** e **convite** (API). |
| **3 — Inventario** | Migrations **005–006**. CRUD **equipamentos**, **categorias/localizacoes**, **manutencoes**, **agendamentos**, **relatorios**, API **dashboard/stats**. |
| **4 — Billing (API)** | Migration **007**. **Billing hexagonal**, Asaas + Pagar.me, webhooks, assinatura (**create** `credit_card` / `boleto` / `pix` — PIX so Asaas), cancel, update-payment, status, invoices, **health** / **provider**. |

**Planejado mas ainda parcial ou pendente**

| Escopo | Situacao |
|--------|----------|
| **Fase 4 — UI billing** | **`/settings/billing`** esqueleto; falta checkout integrado, tokenizacao na UI, QR PIX/boleto na pratica — **4.7–4.9**. |
| **Fase 4 — Assinatura e acesso** | RLS / UX por **`subscription_status`**, trial, dunning — **4.11–4.13**. |
| **Fase 4 — API billing segura** | **JWT** nas rotas `/api/subscriptions/*` — **4.1**. |
| **Fase 4 — Operacional Asaas** | NFS-e e webhook URL em **producao** (painel Asaas). |
| **Fase 3 — Alertas** | **Edge Function** / cron de alertas — **3.11** (existe **asaas-webhook**; falta funcao dedicada a alertas de manutencao). |
| **Fase 5** | Deploy, monitoramento, CI, smoke test — em grande parte **pendente**. |

### Mapa de fases (planejado)

**Status (atualizar com o repo):** **Pronto** — entregavel principal da fase atendido no codigo; **Em andamento** — parte feita, falta escopo da fase; **Não iniciado** — ainda nao comecou. A coluna **O que falta** preenche so quando **Status = Em andamento**; nas outras linhas use **—**.

| Etapa | Fase | Status | O que falta | Semanas (ref.) | Foco principal | Entregavel resumido |
|-------|------|--------|-------------|----------------|----------------|---------------------|
| 1 | [Fase 0](#fase-0) — Monorepo e ambientes | Pronto | — | 1 | Monorepo, Supabase, Asaas sandbox, ambientes | `turbo dev` sobe web + billing localmente (validado) |
| 2 | [Fase 1](#fase-1) — Auth e portal | Pronto | — | 2-3 | Auth, organizacao, shell do portal, catalogo SaaS | Registro/login, dashboard com produtos |
| 3 | [Fase 2](#fase-2) — RBAC e usuarios | Pronto | — | 4-5 | RBAC portal + permissoes por SaaS, usuarios, convites | Gestao de membros e isolamento por tenant |
| 4 | [Fase 3](#fase-3) — Inventario SaaS | Em andamento | **Edge Function** / cron de alertas de manutencao (**3.11**); `asaas-webhook` ja existe — falta funcao/cron de alertas; opcional: notificacoes in-app completas (**3.12**) | 6-9 | SaaS #1 — Inventario e manutencoes | Modulo operacional + relatorios |
| 5 | [Fase 4](#fase-4) — Billing e cobranca | Em andamento | **JWT** nas rotas `/api/subscriptions/*` (**4.1**); checkout UI + integracao ao billing (**4.7–4.9**); RLS/UX por **`subscription_status`**, trial, dunning (**4.11–4.13**); NFS-e e webhook Asaas em **producao** (painel) | 10-13 | Billing hexagonal, gateways, webhooks, checkout UI, assinatura no portal | Cobranca PIX/boleto/cartao, NFS-e, bloqueio por status |
| 6 | [Fase 5](#fase-5) — Lancamento MVP | Não iniciado | — | 14-16 | Qualidade, deploy producao, monitoramento, smoke tests | MVP em producao |
| — | [Apos o lancamento](#apos-o-lancamento) — Evolucao pos-MVP | Não iniciado | — | continuo | Evolucao pos-MVP | Roadmap de produto |

### Dependencias e ordem sugerida

1. **Fase 0** e pre-requisito de tudo (repo, Supabase, credenciais, billing service rodando localmente).
2. **Fase 1** estabelece identidade, organizacao e navegacao do portal — sem isso nao ha produto autenticado.
3. **Fase 2** pode comecar em paralelo ao final da Fase 1, mas precisa do modelo `org` + Auth estavel.
4. **Fase 3** (Inventario) e o primeiro modulo de receita de uso; depende de portal + RBAC minimo para rotas protegidas.
5. **Fase 4** — backend de billing pode avancar em paralelo ao modulo de inventario, mas **checkout integrado e bloqueio por assinatura** assumem organizacao e status persistidos (Fases 1-2 + migrations de assinatura).
6. **Fase 5** agrega tudo para release.

### Checklists por fase

Nas secoes [Fase 0](#fase-0) a [Fase 5](#fase-5), marque `[x]` conforme o codigo for ficando alinhado ao quadro **Planejado x executado** acima.

---

## Fase 0 — Setup do Projeto (Semana 1)

<span id="fase-0"></span>

**Objetivo:** Estrutura do monorepo pronta, ambientes configurados, CI basico.

### Tasks

- [x] **0.1** Criar repositorio no GitHub (remoto `origin` configurado; **sincronizar** commits pendentes com `git push` quando for commitar)
- [x] **0.2** Inicializar monorepo com Turborepo
  - `apps/web` — Next.js 15 com App Router
  - `apps/billing-service` — Node.js com Express/Fastify
  - `packages/shared` — Tipos TypeScript compartilhados
- [x] **0.3** Configurar Next.js
  - TypeScript strict mode
  - Tailwind CSS
  - shadcn/ui (instalar componentes base: Button, Card, Input, Dialog, Table, Dropdown)
  - ESLint + Prettier
- [x] **0.4** Criar projeto no Supabase
  - Anotar URL e chaves (anon, service_role)
  - Configurar Supabase CLI local (`supabase init`)
  - **Feito no hosted:** `supabase link` + aplicar migrations no remoto (`supabase db push` ou SQL Editor; `migration repair` se o esquema ja existia sem historico CLI)
- [x] **0.5** Criar conta Asaas
  - Ativar ambiente sandbox (https://sandbox.asaas.com)
  - Criar conta digital PJ
  - Gerar **API key** na aba Integracoes (sandbox) → `ASAAS_API_KEY` + `ASAAS_BASE_URL` sandbox no `.env`
  - Definir **token do webhook** (mesmo valor no painel Asaas e em `ASAAS_WEBHOOK_TOKEN`)
  - Configurar **URL do webhook** (Edge `.../functions/v1/asaas-webhook` **ou** billing `.../api/webhooks/asaas` + tunel) — ver subsecao *Fechar a Fase 0*
- [x] **0.6** Configurar variáveis de ambiente
  - `.env.local` para Next.js (SUPABASE_URL, SUPABASE_ANON_KEY, BILLING_SERVICE_URL)
  - `.env` para billing service: `BILLING_PROVIDER` (`asaas` ou `pagarme`), credenciais do gateway ativo (`ASAAS_*` ou `PAGARME_*`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [x] **0.7** Configurar docker-compose.yml para desenvolvimento local
  - Supabase local (opcional, pode usar hosted)
  - Billing service

**Entregavel:** `turbo dev` sobe frontend e billing service localmente.

**Validacao (feito):** `npm run dev` ou `turbo dev` — **http://localhost:3000** (web) e **http://localhost:4000/health** (billing) confirmados em ambiente local (Mar 2026).

#### Fechar a Fase 0 (ordem pratica — depois do monorepo ja existir)

1. **Supabase (0.4)** — Projeto criado; URL + **anon** + **service_role** no painel. CLI: `supabase link` ao projeto remoto; migrations com `db push` (ou SQL Editor). **Estado Mar 2026:** link + **001–010** aplicadas no hosted.
2. **Variaveis de ambiente (0.6)**  
   - `apps/web/.env.local` — copiar de [apps/web/.env.example](./apps/web/.env.example): `NEXT_PUBLIC_SUPABASE_*`, `BILLING_SERVICE_URL=http://localhost:4000`.  
   - `apps/billing-service/.env` — copiar de [apps/billing-service/.env.example](./apps/billing-service/.env.example): `BILLING_PROVIDER=asaas`, `ASAAS_*`, `SUPABASE_*`, `FRONTEND_URL`.
3. **Asaas (0.5) — com conta ja criada**  
   - Usar **sandbox**: `ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3` e API key de **Integracoes** (ambiente de testes).  
   - Definir um **token de webhook** (string secreta); colar o **mesmo** valor em `ASAAS_WEBHOOK_TOKEN` no `.env` do billing service e no painel Asaas (onde o Asaas pede token / senha do webhook).  
   - **URL do webhook (recomendado para comecar):** Edge Function Supabase — `https://<PROJECT_REF>.supabase.co/functions/v1/asaas-webhook` (HTTPS publico, sem tunel). Ver *Webhook Asaas* abaixo.  
   - **Alternativa:** `POST` para `https://<host-publico>/api/webhooks/asaas` no **billing-service** (porta 4000 + ngrok/tunel se for localhost). **Nao** uses as duas URLs ao mesmo tempo para o mesmo fluxo.  
4. **Subir tudo (0.7 + entregavel)** — Na raiz: `npm install` (se necessario), `npm run dev` ou `turbo dev`; confirmar `http://localhost:3000` (web) e `http://localhost:4000/health` (billing). Opcional: `docker compose up` so para o billing, com `.env` montado.  
5. **Repositorio remoto + CI (0.1)** — Repo + `origin` ok; **push** dos commits em falta quando commitares; Actions/workflow de CI (lint/build) quando quiseres.

##### Webhook Asaas (0.5) — passo a passo

O Asaas envia **`POST`** com JSON e o header **`asaas-access-token`** (mesmo valor em todo o lado). Ha **duas** formas de receber — escolhe **uma** (evita duplicar registos em `payment_events`):

| Destino | URL no Asaas | Onde configurar o token |
|---------|----------------|-------------------------|
| **Edge Function (recomendado)** | `https://<PROJECT_REF>.supabase.co/functions/v1/asaas-webhook` | Secret **`ASAAS_WEBHOOK_TOKEN`** no projeto Supabase + (opcional) `supabase/.env.edge` local |
| **Billing Node** | `https://<tunel-ou-deploy>/api/webhooks/asaas` | `apps/billing-service/.env` → `ASAAS_WEBHOOK_TOKEN` |

Codigo da funcao: [supabase/functions/asaas-webhook/index.ts](./supabase/functions/asaas-webhook/index.ts). Logica espelha [asaas.webhook.ts](./apps/billing-service/src/adapters/asaas/asaas.webhook.ts) + persistencia em `organizations`, `subscriptions`, `invoices`, `payment_events`.

**A) Edge Function — Supabase (Dashboard + CLI)**

1. **Deploy da funcao** (na pasta do repo, com [Supabase CLI](https://supabase.com/docs/guides/cli) logado):  
   `supabase functions deploy asaas-webhook`  
   O ficheiro [supabase/config.toml](./supabase/config.toml) ja tem `[functions.asaas-webhook] verify_jwt = false` (obrigatorio: o Asaas **nao** envia JWT do Supabase).

2. **Secret no projeto Supabase** (mesmo token que vais por no Asaas):  
   `supabase secrets set ASAAS_WEBHOOK_TOKEN=<teu_token> --project-ref <PROJECT_REF>`  
   Ou: Dashboard → **Project Settings** → **Edge Functions** → **Secrets** → adicionar `ASAAS_WEBHOOK_TOKEN`.

3. **URL para colar no Asaas:**  
   `https://<PROJECT_REF>.supabase.co/functions/v1/asaas-webhook`  
   (`PROJECT_REF` = Reference ID do projeto, igual ao subdominio em `SUPABASE_URL`.)

4. **Testar localmente (opcional):** copia [supabase/.env.edge.example](./supabase/.env.edge.example) para `supabase/.env.edge`, preenche `ASAAS_WEBHOOK_TOKEN`, depois:  
   `supabase functions serve asaas-webhook --env-file supabase/.env.edge`

**B) Painel Asaas (sandbox ou producao)**

1. Se nao encontrares **Integracoes → Webhooks** no menu, abre diretamente (sandbox):  
   `https://sandbox.asaas.com/customerConfigIntegrations/webhooks`  
   (Producao: troca o dominio pelo da conta real, se aplicavel.)

2. **Criar Webhook** — preenche URL (Edge ou billing Node), **Gerar token** (ou token proprio conforme regras Asaas), email de erro, API **v3**, webhook **ativo**.

3. **Tipo de envio** — na conta do projeto esta definido como **Nao sequencial** (na API Asaas: `NON_SEQUENTIALLY`). O Asaas **envia os dados** do evento no corpo do `POST` normalmente, mas as notificacoes **podem chegar em paralelo** e **sem ordem garantida** entre si (nao e uma fila estritamente ordenada). Implicacoes para o backend: nao assumir ordem fixa (ex.: `PAYMENT_RECEIVED` antes/depois de outros tipos); preferir operacoes **idempotentes** onde possivel (`upsert`, mesmo `external_event_id` com cuidado). O modo **Sequencial** (`SEQUENTIALLY`) serializa envios, mas se o endpoint falhar pode **pausar a fila** de sincronizacao — ver [doc Asaas sobre webhooks e fila](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook).

4. **Eventos** — na conta do projeto foram ativadas **todas** as opcoes nas secoes abaixo (Mar 2026). Lista de referencia: [secao *Eventos habilitados no Asaas*](#eventos-habilitados-no-asaas-documentacao-da-conta).

5. O token do Asaas deve ser **identico** ao `ASAAS_WEBHOOK_TOKEN` definido nos **Secrets** da Edge Function (ou no `.env` do billing, se usares essa rota).

**C) Billing-service Node (alternativa)**

1. Sobe o billing na **4000** + tunel HTTPS (**ngrok** / **Cloudflare**) para `.../api/webhooks/asaas`.  
2. `ASAAS_WEBHOOK_TOKEN` em `apps/billing-service/.env`.

**D) Testar**

- Dashboard Supabase → **Edge Functions** → **Logs** (se usares Edge), ou logs do processo Node.  
- Tabela **`payment_events`** e alteracoes em **`organizations`** / **`invoices`** conforme o evento.

<span id="eventos-habilitados-no-asaas-documentacao-da-conta"></span>

##### Eventos habilitados no Asaas (documentacao da conta)

Configuracao registada no painel Asaas (**API v3**), com **todas** as opcoes marcadas nas categorias indicadas (capturas Mar 2026). **Tipo de envio do webhook:** **Nao sequencial** (`NON_SEQUENTIALLY`) — ver passo 3 em **B) Painel Asaas** acima.

**Comportamento no backend** ([`asaas-webhook`](./supabase/functions/asaas-webhook/index.ts) / [`asaas.webhook.ts`](./apps/billing-service/src/adapters/asaas/asaas.webhook.ts)):

- **Todos** os eventos validos geram registo de auditoria em **`payment_events`** (payload + `event_type`).
- **Logica de dominio** (atualiza `organizations`, `subscriptions`, `invoices`) aplica-se **apenas** a:  
  `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_DELETED`, `SUBSCRIPTION_INACTIVATED`.  
- Os **demais** eventos listados abaixo ficam **so em auditoria** ate serem mapeados no codigo (notas fiscais, conta, Pix automatico, checkouts, chargebacks, etc.).

**1) Cobranças (todos selecionados)**  
`PAYMENT_AUTHORIZED`, `PAYMENT_AWAITING_RISK_ANALYSIS`, `PAYMENT_APPROVED_BY_RISK_ANALYSIS`, `PAYMENT_REPROVED_BY_RISK_ANALYSIS`, `PAYMENT_CREATED`, `PAYMENT_UPDATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_ANTICIPATED`, `PAYMENT_OVERDUE`, `PAYMENT_RESTORED`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED`, `PAYMENT_REFUND_IN_PROGRESS`, `PAYMENT_REFUND_DENIED`, `PAYMENT_RECEIVED_IN_CASH_UNDONE`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE`, `PAYMENT_AWAITING_CHARGEBACK_REVERSAL`, `PAYMENT_DUNNING_REQUESTED`, `PAYMENT_DUNNING_RECEIVED`, `PAYMENT_BANK_SLIP_VIEWED`, `PAYMENT_BANK_SLIP_CANCELLED`, `PAYMENT_CHECKOUT_VIEWED`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_SPLIT_CANCELLED`, `PAYMENT_SPLIT_DIVERGENCE_BLOCK`, `PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED`.

**2) Assinaturas (todos selecionados)**  
`SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_INACTIVATED`, `SUBSCRIPTION_DELETED`, `SUBSCRIPTION_SPLIT_DISABLED`, `SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK`, `SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK_FINISHED`.

**3) Checkouts (todos selecionados)**  
`CHECKOUT_CREATED`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED`, `CHECKOUT_PAID`.

**4) Pix automatico (todos selecionados)**  
`PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CREATED`, `PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED`, `PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED`, `PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED`, `PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED`, `PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_CREATED`, `PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_SCHEDULED`, `PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_REFUSED`, `PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_CANCELLED`, `PIX_AUTOMATIC_RECURRING_ELIGIBILITY_UPDATED`.

**5) Notas fiscais (todos selecionados)**  
`INVOICE_CREATED`, `INVOICE_UPDATED`, `INVOICE_SYNCHRONIZED`, `INVOICE_AUTHORIZED`, `INVOICE_PROCESSING_CANCELLATION`, `INVOICE_CANCELED`, `INVOICE_CANCELLATION_DENIED`, `INVOICE_ERROR`.

**6) Situação da conta (todos selecionados)**  
`ACCOUNT_STATUS_BANK_ACCOUNT_INFO_APPROVED`, `ACCOUNT_STATUS_BANK_ACCOUNT_INFO_AWAITING_APPROVAL`, `ACCOUNT_STATUS_BANK_ACCOUNT_INFO_PENDING`, `ACCOUNT_STATUS_BANK_ACCOUNT_INFO_REJECTED`, `ACCOUNT_STATUS_COMMERCIAL_INFO_APPROVED`, `ACCOUNT_STATUS_COMMERCIAL_INFO_AWAITING_APPROVAL`, `ACCOUNT_STATUS_COMMERCIAL_INFO_EXPIRED`, `ACCOUNT_STATUS_COMMERCIAL_INFO_EXPIRING_SOON`, `ACCOUNT_STATUS_COMMERCIAL_INFO_PENDING`, `ACCOUNT_STATUS_COMMERCIAL_INFO_REJECTED`, `ACCOUNT_STATUS_DOCUMENT_APPROVED`, `ACCOUNT_STATUS_DOCUMENT_AWAITING_APPROVAL`, `ACCOUNT_STATUS_DOCUMENT_PENDING`, `ACCOUNT_STATUS_DOCUMENT_REJECTED`, `ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED`, `ACCOUNT_STATUS_GENERAL_APPROVAL_AWAITING_APPROVAL`, `ACCOUNT_STATUS_GENERAL_APPROVAL_PENDING`, `ACCOUNT_STATUS_GENERAL_APPROVAL_REJECTED`.

**7) Bloqueios de saldo (todos selecionados)**  
`BALANCE_VALUE_BLOCKED`, `BALANCE_VALUE_UNBLOCKED`.

---

## Fase 1 — Autenticacao + Portal Shell (Semanas 2-3)

<span id="fase-1"></span>

**Objetivo:** Usuario cria conta, faz login, ve o portal com catalogo de SaaS.

### Semana 2 — Auth + Registro

- [ ] **1.1** Criar migration `001_organizations.sql`
  ```sql
  CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    asaas_customer_id text,
    subscription_status text DEFAULT 'trialing',
    plan text DEFAULT 'free',
    trial_ends_at timestamptz DEFAULT now() + interval '14 days',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
  ```
- [ ] **1.2** Criar migration `002_org_members.sql`
  ```sql
  CREATE TABLE org_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    portal_role text NOT NULL DEFAULT 'member',
    status text NOT NULL DEFAULT 'active',
    joined_at timestamptz DEFAULT now(),
    UNIQUE(org_id, user_id),
    CONSTRAINT valid_portal_role CHECK (
      portal_role IN ('account_owner', 'account_admin', 'billing_viewer', 'member')
    )
  );
  ```
- [x] **1.3** Configurar Supabase Auth
  - Habilitar email/senha
  - Configurar redirect URLs
  - **JWT hook (`custom_access_token_hook`):** concluido — migration `010_custom_access_token_hook.sql`, hook ativo em hosted (`/auth/hooks`) e local (`config.toml`); access token do login inclui `org_id` e `portal_role`. Detalhes em [ARCHITECTURE.md](./ARCHITECTURE.md) §5.1.
- [ ] **1.4** Implementar pagina `/register`
  - Formulario: nome completo, email, senha, nome da empresa
  - Ao registrar: criar user (Supabase Auth) → criar organization → criar org_member (account_owner)
  - Redirecionar para `/dashboard`
- [ ] **1.5** Implementar pagina `/login`
  - Formulario: email, senha
  - Redirecionar para `/dashboard` apos login
- [ ] **1.6** Implementar pagina `/forgot-password`
  - Envio de email de reset via Supabase Auth
- [ ] **1.7** Criar middleware Next.js
  - Rotas `(portal)/*`: redirecionar para `/login` se nao autenticado
  - Rotas `(auth)/*`: redirecionar para `/dashboard` se ja autenticado

### Semana 3 — Portal Shell + Catalogo

- [ ] **1.8** Criar migration `003_saas_products.sql`
  ```sql
  CREATE TABLE saas_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    icon_url text,
    is_active boolean DEFAULT false,
    is_coming_soon boolean DEFAULT false,
    display_order integer DEFAULT 0
  );

  INSERT INTO saas_products (name, slug, description, is_active, display_order)
  VALUES
    ('Inventario de Equipamentos', 'equipment-inventory',
     'Gerencie seus equipamentos e manutencoes preventivas e corretivas.', true, 1),
    ('Prontuario Eletronico', 'electronic-health-record',
     'Gestao completa de prontuarios de pacientes.', false, 2),
    ('Inteligencia de Dados', 'data-intelligence',
     'Dashboards e analises avancadas dos seus dados.', false, 3);

  UPDATE saas_products SET is_coming_soon = true
  WHERE slug IN ('electronic-health-record', 'data-intelligence');
  ```
- [ ] **1.9** Implementar layout `(portal)/layout.tsx`
  - Sidebar com navegacao
  - Header com nome do usuario, nome da empresa, avatar
  - Indicador de plano/trial
- [ ] **1.10** Implementar pagina `/dashboard`
  - Cards de produtos SaaS (grid responsivo)
  - Produtos ativos: card clicavel com link para o modulo
  - Produtos "em breve": card com badge "Em Breve" e descricao (marketing)
  - Resumo da conta: status da assinatura, dias restantes de trial
- [ ] **1.11** Implementar area publica
  - Landing page `/` — proposta de valor, CTA para registro
  - Pagina `/pricing` — plano Pro R$600/mes, features incluidas
  - Pagina `/features` — detalhamento das funcionalidades do SaaS #1

**Entregavel:** Usuario cria conta, faz login, ve dashboard com catalogo de SaaS. Produtos "em breve" aparecem como propaganda.

---

## Fase 2 — RBAC Dual + Gestao de Usuarios (Semanas 4-5)

<span id="fase-2"></span>

**Objetivo:** Sistema de permissoes completo. Admin gerencia usuarios e papeis.

### Semana 4 — Modelo de Permissions

- [ ] **2.1** Criar migration `004_saas_permissions.sql`
  - Tabela `saas_permissions` com todas as permissions do SaaS #1
  - Tabela `saas_default_roles` com roles default (saas_admin, manager, operator, viewer)
  - Tabela `saas_custom_roles` para roles customizados por empresa
  - Tabela `saas_role_permissions` mapeando roles a permissions
  - Tabela `saas_access` vinculando membros a produtos com roles
  - Seed: popular permissions e roles default do Inventario
- [ ] **2.2** Criar funcao SQL `has_permission()`
  - Recebe user_id, org_id, product_slug, permission_code
  - Retorna boolean
  - SECURITY DEFINER para acesso direto as tabelas de permissao
- [ ] **2.3** Criar hook React `usePermissions()`
  - Busca permissions do usuario logado para o produto atual
  - Cache local (evitar queries repetidas)
  - Retorna: `{ hasPermission(code): boolean, permissions: string[], role: string }`
- [ ] **2.4** Criar componente `<PermissionGate>`
  - Wrapper que renderiza children apenas se o usuario tem a permission
  - Uso: `<PermissionGate permission="equipment.delete"><DeleteButton /></PermissionGate>`
- [ ] **2.5** Criar middleware de autorizacao para rotas do portal
  - Verificar portal_role para rotas de settings/billing/users
  - Redirecionar para /dashboard se nao autorizado

### Semana 5 — Telas de Gestao

- [ ] **2.6** Implementar pagina `/settings`
  - Dados da empresa (nome, slug)
  - Edicao por account_owner e account_admin
- [ ] **2.7** Implementar pagina `/settings/users`
  - Lista de membros da organizacao (nome, email, portal_role, SaaS roles, status)
  - Convidar novo usuario (por email)
  - Alterar portal_role de um membro
  - Atribuir/remover acesso a SaaS com role especifico
  - Suspender/reativar membro
  - Acessivel apenas por account_owner e account_admin
- [ ] **2.8** Implementar fluxo de convite
  - Admin insere email do novo membro
  - Sistema cria org_member com status `invited`
  - Envia email de convite (Supabase Auth invite ou magic link)
  - Ao aceitar: usuario cria senha, status muda para `active`
- [ ] **2.9** Implementar gestao de roles customizados
  - Tela para criar novo role para um SaaS (ex: "Tecnico Senior")
  - Selecionar permissions via checkboxes agrupados por categoria
  - Editar e remover roles customizados
- [ ] **2.10** Testes de isolamento de tenant
  - Criar 2 organizacoes de teste
  - Verificar que usuario da Org A nao ve dados da Org B
  - Verificar que RLS bloqueia queries diretas

**Entregavel:** Admin gerencia usuarios, atribui papeis granulares, convida novos membros. Permissoes funcionam end-to-end.

---

## Fase 3 — SaaS #1: Inventario de Equipamentos (Semanas 6-9)

<span id="fase-3"></span>

**Objetivo:** Modulo completo de gestao de equipamentos e manutencoes.

### Semana 6 — Equipamentos CRUD

- [ ] **3.1** Criar migration `005_equipment.sql`
  - Tabelas: `categories`, `locations`, `equipment`
  - RLS policies com tenant isolation
  - Indice em `org_id` para todas as tabelas
- [ ] **3.2** Implementar pagina `/equipment` — lista
  - Tabela responsiva com colunas: nome, serial, categoria, localizacao, status
  - Filtros: por categoria, localizacao, status
  - Busca por nome/serial
  - Paginacao
  - Botao "Novo Equipamento" (visivel se `equipment.create`)
  - Botao "Excluir" (visivel se `equipment.delete`)
- [ ] **3.3** Implementar pagina `/equipment/new` — cadastro
  - Formulario: nome, serial, categoria, localizacao, status, descricao, data aquisicao, custo, foto
  - Upload de foto para Supabase Storage
  - Validacao com Zod
  - Protegido por permission `equipment.create`
- [ ] **3.4** Implementar pagina `/equipment/[id]` — detalhe e edicao
  - Visualizacao completa do equipamento
  - Edicao inline (se `equipment.edit`)
  - Historico de manutencoes do equipamento
  - Proxima manutencao agendada
- [ ] **3.5** Implementar gestao de categorias e localizacoes
  - CRUD basico em modais ou drawer
  - Protegido por `category.manage` e `location.manage`

### Semana 7 — Manutencoes

- [ ] **3.6** Criar migration `006_maintenance.sql`
  - Tabelas: `maintenance_records`, `maintenance_schedules`
  - RLS policies com tenant isolation
- [ ] **3.7** Implementar pagina `/maintenance` — registros
  - Tabela: equipamento, tipo (preventiva/corretiva/preditiva), data, tecnico, custo, status
  - Filtros: por equipamento, tipo, periodo
  - Botao "Registrar Manutencao" (se `maintenance.create`)
- [ ] **3.8** Implementar formulario de registro de manutencao
  - Selecionar equipamento
  - Tipo, data, descricao, tecnico, custo
  - Upload de anexos (fotos, laudos)
  - Ao salvar: atualizar `last_performed_date` do schedule se existir
- [ ] **3.9** Implementar pagina `/maintenance/schedules` — agendamentos
  - Lista de agendamentos recorrentes
  - Criar agendamento: equipamento, frequencia (dias/semanas/meses), alerta antecipado
  - Ativar/desativar agendamento
  - Protegido por `schedule.manage`

### Semana 8 — Dashboard e Alertas

- [ ] **3.10** Implementar dashboard do SaaS #1
  - Total de equipamentos (por status)
  - Manutencoes realizadas no mes
  - Custo total de manutencoes no mes
  - Equipamentos com manutencao vencida (alerta vermelho)
  - Proximas manutencoes (7 dias)
  - Grafico: manutencoes por mes (ultimos 6 meses)
  - Grafico: custo de manutencao por categoria
- [ ] **3.11** Criar Edge Function `maintenance-alerts`
  - Cron diario (ou a cada 12h)
  - Busca schedules com `next_due_date <= hoje + alert_days_before`
  - Registra alertas (tabela ou notificacao)
  - Futuro: enviar email/WhatsApp
- [ ] **3.12** Implementar sistema de notificacoes no portal
  - Icone de sino no header com badge de contagem
  - Dropdown com lista de alertas
  - Marcar como lido

### Semana 9 — Relatorios e Polish

- [ ] **3.13** Implementar pagina `/reports`
  - Relatorio: inventario completo (exportar CSV/PDF)
  - Relatorio: historico de manutencoes por equipamento
  - Relatorio: custos por periodo
  - Relatorio: equipamentos sem manutencao no prazo
  - Protegido por `reports.view`
- [ ] **3.14** Implementar exportacao CSV
  - Gerar CSV no browser (sem server processing)
  - Equipamentos e manutencoes
- [ ] **3.15** Polish do modulo
  - Loading states em todas as tabelas e formularios
  - Empty states com CTAs
  - Mensagens de erro/sucesso (toasts)
  - Responsividade mobile

**Entregavel:** Modulo de inventario e manutencoes 100% funcional com dashboard, alertas e relatorios.

---

## Fase 4 — Billing Service + Asaas (Semanas 10-13)

<span id="fase-4"></span>

**Objetivo:** Billing service rodando, integracao Asaas completa, checkout transparente com PIX/boleto/cartao, portal de assinatura proprio, emissao de NFS-e automatica, controle de acesso por assinatura.

**Arquitetura hexagonal (billing plugavel):**
- O servico expoe **portas** (`BillingGatewayPort`, `BillingPersistencePort`) e **dois adaptadores de gateway** prontos: **Asaas** (padrao, `BILLING_PROVIDER=asaas`) e **Pagar.me** (backup, `BILLING_PROVIDER=pagarme`).
- Webhooks: `/api/webhooks/asaas` e `/api/webhooks/pagarme` mapeiam payloads para eventos de dominio comuns antes de gravar no Supabase.
- **Producao inicial:** Asaas. **Alternativa imediata:** trocar env e reiniciar o container para Pagar.me, sem alterar o Next.js.

**Nota:** Como o Asaas nao oferece checkout hosted nem customer portal, e necessario construir UI de checkout e gestao de assinatura. Isso adiciona ~2 semanas ao escopo original. Em compensacao, o Asaas oferece emissao de NFS-e integrada e plano gratuito.

### Semana 10 — Billing Service Base

- [ ] **4.1** Implementar billing service (Node.js/TypeScript) em **arquitetura hexagonal**
  - Express ou Fastify
  - Porta `BillingGatewayPort` com adaptadores Asaas (padrao) e Pagar.me (backup)
  - Rota POST `/api/subscriptions/create` — cria customer (se necessario) e assinatura no gateway ativo (`credit_card`, `boleto`, `pix`; PIX completo apenas com Asaas)
  - Rota POST `/api/subscriptions/cancel` — cancela assinatura
  - Rota POST `/api/subscriptions/update-payment` — atualiza metodo de pagamento
  - Rota GET `/api/subscriptions/status/:orgId` — consulta status
  - Rota GET `/api/subscriptions/invoices/:orgId` — lista cobrancas
  - Rota GET `/api/subscriptions/provider` — retorna gateway ativo
  - Middleware: validar JWT do Supabase em requests autenticados
- [ ] **4.2** Criar migration `007_subscriptions.sql`
  - Tabelas: `subscriptions`, `invoices`, `payment_events`
  - RLS: somente leitura para membros, escrita via service_role
- [ ] **4.3** Implementar processamento de webhooks (hexagonal)
  - Rota POST `/api/webhooks/asaas` — verificar `asaas-access-token`
  - Rota POST `/api/webhooks/pagarme` — verificar `x-hub-signature` (HMAC-SHA1) quando `BILLING_PROVIDER=pagarme`
  - Mapear payloads para eventos de dominio unicos antes de persistir
  - Eventos Asaas tratados:
    - `PAYMENT_CREATED` → registrar cobranca criada
    - `PAYMENT_RECEIVED` → registrar pagamento confirmado, ativar assinatura
    - `PAYMENT_OVERDUE` → marcar como past_due
    - `PAYMENT_DELETED` → registrar cancelamento de cobranca
    - `PAYMENT_REFUNDED` → registrar estorno
    - `PAYMENT_CONFIRMED` → confirmar pagamento (PIX/boleto)
  - Eventos Pagar.me (adapter backup): `subscription.created`, `charge.paid`, `charge.payment_failed`, `subscription.canceled`
  - Registrar evento em `payment_events` (auditoria)
- [ ] **4.4** Configurar emissao de NFS-e automatica
  - Habilitar emissao de notas fiscais no painel Asaas
  - Configurar dados fiscais da empresa (CNPJ, inscricao municipal, regime tributario)
  - Asaas emite NFS-e automaticamente apos pagamento confirmado
- [ ] **4.5** Dockerfile para billing service
- [ ] **4.6** Deploy do billing service no Fly.io ou Render

### Semana 11 — Checkout Transparente (UI propria)

- [ ] **4.7** Implementar componente `<CheckoutForm>`
  - Selecao de metodo de pagamento: PIX, Boleto, Cartao de Credito
  - Formulario de cartao: numero, validade, CVV, nome (tokenizacao via Asaas)
  - Exibicao de QR Code PIX com copia-e-cola e timer de expiracao
  - Exibicao de boleto com codigo de barras, linha digitavel e link para PDF
  - Validacao client-side com Zod
  - Loading states e feedback visual durante processamento
  - Tratamento de erros (cartao recusado, timeout, etc.)
- [ ] **4.8** Implementar pagina `/settings/billing/checkout`
  - Resumo do plano: "Plano Pro — R$600/mes"
  - Componente `<CheckoutForm>` integrado
  - Redireciona para `/settings/billing` apos sucesso
- [ ] **4.9** Implementar tokenizacao segura de cartao
  - Usar tokenizacao do Asaas para capturar dados do cartao com seguranca
  - Enviar apenas o token ao billing service (nunca dados crus do cartao)
  - PCI compliance via tokenizacao client-side

### Semana 12 — Portal de Assinatura (UI propria)

- [ ] **4.10** Implementar pagina `/settings/billing`
  - Status da assinatura (ativa, trial, vencida, cancelada)
  - Dias restantes de trial
  - Botao "Assinar Plano Pro" (redireciona para `/settings/billing/checkout`)
  - Secao "Metodo de pagamento atual" (ultimos 4 digitos do cartao, ou PIX/boleto)
  - Botao "Trocar metodo de pagamento" (abre modal com formulario)
  - Botao "Cancelar assinatura" (com confirmacao e motivo)
  - Historico de cobrancas com status (paga, pendente, vencida) e links para boleto/comprovante/NFS-e
  - Acessivel apenas por `account_owner`, `account_admin`
  - Cobrancas visiveis para `billing_viewer`
- [ ] **4.11** Implementar controle de acesso por assinatura
  - RLS policy: bloquear acesso a dados se `subscription_status` nao e `active` ou `trialing`
  - Pagina de bloqueio: "Sua assinatura expirou. Contate o administrador."
  - Banner de aviso quando trial esta acabando (ultimos 3 dias)
  - Banner de aviso quando pagamento falhou (past_due)
- [ ] **4.12** Implementar fluxo de trial
  - 14 dias de trial ao criar conta
  - Acesso completo durante trial
  - Ao expirar: bloquear acesso aos SaaS, manter acesso ao portal/billing
  - CTA para assinar na pagina de bloqueio
- [ ] **4.13** Implementar dunning (cobranca de inadimplentes)
  - Logica de retry: ao receber `PAYMENT_OVERDUE`, agendar nova tentativa
  - Notificacao por email ao admin da org apos falha de pagamento
  - Grace period de 7 dias antes de cancelar assinatura
  - Escalar status: `active` → `past_due` → `unpaid` → `canceled`

### Semana 13 — Testes e Robustez

- [ ] **4.14** Testar fluxo completo no sandbox Asaas
  - Criar assinatura com cartao de teste
  - Criar assinatura via PIX (simular pagamento)
  - Criar assinatura via boleto (simular pagamento)
  - Simular falha de pagamento (PAYMENT_OVERDUE)
  - Simular cancelamento
  - Verificar que webhooks atualizam corretamente o banco
  - Verificar emissao de NFS-e apos pagamento
- [ ] **4.15** Implementar retry para webhooks
  - Se processamento falhar, logar erro e retornar 500
  - Implementar idempotencia (verificar se evento ja foi processado)
  - Dead letter: logar eventos que falharam 3+ vezes para investigacao
- [ ] **4.16** Testar isolamento de billing
  - Org A com assinatura ativa ve seus dados
  - Org B com assinatura cancelada nao ve dados
  - Admin da Org A nao ve cobrancas da Org B

**Entregavel:** Billing completo. Empresa assina via cartao, PIX ou boleto, NFS-e emitida automaticamente, acesso e controlado por status de assinatura. Portal de gestao de assinatura proprio.

---

## Fase 5 — Polish + Lancamento (Semanas 14-16)

<span id="fase-5"></span>

**Objetivo:** Produto pronto para primeiros clientes.

### Semana 14 — Qualidade

- [ ] **5.1** Responsividade mobile
  - Testar todas as telas em mobile (375px) e tablet (768px)
  - Sidebar colapsavel em mobile
  - Tabelas com scroll horizontal em mobile
- [ ] **5.2** SEO da area publica
  - Meta tags (title, description, og:image) em landing, pricing, features
  - Sitemap.xml
  - robots.txt
- [ ] **5.3** Performance
  - Lazy loading de rotas pesadas (relatorios, graficos)
  - Otimizacao de imagens (next/image)
  - Verificar Core Web Vitals
- [ ] **5.4** Error handling
  - Error boundary global
  - Paginas de erro customizadas (404, 500)
  - Toast de erro para falhas de API
  - Retry automatico em queries (React Query / SWR)
- [ ] **5.5** Acessibilidade basica
  - Labels em todos os inputs
  - Contraste de cores WCAG AA
  - Navegacao por teclado nas tabelas e modais

### Semana 15-16 — Deploy e Lancamento

- [ ] **5.6** Deploy producao
  - Vercel: conectar repo, configurar variaveis de ambiente
  - Fly.io/Render: deploy do billing service com variaveis de producao
  - Supabase: rodar migrations no projeto de producao
  - Asaas: configurar webhook URL de producao e dados fiscais para NFS-e
- [ ] **5.7** Dominio e DNS
  - Configurar dominio customizado no Vercel
  - HTTPS automatico
- [ ] **5.8** Monitoramento
  - Logs do billing service (Fly.io logs)
  - Supabase dashboard (queries, auth, storage)
  - Asaas dashboard (cobrancas, recebimentos, NFS-e)
  - Alertas: configurar notificacao se billing service cair
- [ ] **5.9** Documentacao para o usuario final
  - Guia de primeiros passos (onboarding)
  - FAQ basico
- [ ] **5.10** Smoke test completo
  - Registro de nova empresa
  - Login
  - Navegar no catalogo
  - Cadastrar equipamentos
  - Registrar manutencoes
  - Criar agendamento
  - Assinar plano via cartao, PIX e boleto (Asaas sandbox → producao)
  - Convidar usuario
  - Testar permissoes por papel

**Entregavel:** Produto em producao, pronto para os primeiros clientes pagantes.

---

## Apos o Lancamento

<span id="apos-o-lancamento"></span>

### Curto prazo (1-2 meses)

- [ ] Feedback dos primeiros clientes
- [ ] Correcao de bugs e ajustes de UX
- [ ] Melhorar relatorios baseado em demanda real
- [ ] Otimizar conversao do checkout (A/B test em metodos de pagamento)
- [ ] Email transacional: alerta de manutencao, convite, reset password

### Medio prazo (3-6 meses)

- [ ] SaaS #2 — Prontuario Eletronico
  - Novas saas_permissions e saas_roles para o produto
  - Zero mudanca no portal e billing
- [ ] App mobile (React Native ou PWA)
- [ ] Integracao com WhatsApp (alertas de manutencao)
- [ ] Campos customizados por empresa (custom_fields JSONB)
- [ ] API publica para integracoes

### Longo prazo (6-12 meses)

- [ ] SaaS #3 — Inteligencia de Dados
- [ ] Migracao para AWS (se escala justificar)
- [ ] Multi-idioma (PT/EN/ES)
- [ ] Marketplace de integracoes
- [ ] Planos diferenciados por SaaS

---

## Metricas de Sucesso (MVP)

| Metrica | Meta |
|---------|------|
| Tempo ate primeiro cliente pagante | < 4 meses apos inicio |
| MRR ao final de 6 meses | R$6.000 (10 clientes) |
| Churn mensal | < 5% |
| Uptime | > 99.5% |
| Tempo de onboarding | < 30 minutos |

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Free tier do Supabase insuficiente | Media | Medio | Upgrade para Pro ($25/mes) quando necessario |
| Billing service cai e perde webhook | Baixa | Alto | Asaas faz retry; dead letter logging; idempotencia |
| Data leak entre tenants | Baixa | Critico | RLS em todas as tabelas + testes de isolamento |
| Checkout proprio aumenta escopo | Alta | Medio | Componentizar checkout; reutilizar para futuros SaaS |
| Asaas instavel em pico | Baixa | Alto | Fila de retry; fallback manual via dashboard Asaas |
| Escopo cresce alem do planejado | Alta | Alto | Manter escopo rigido do MVP; features novas so apos lancamento |

---

Ultima atualizacao: Marco 2026
