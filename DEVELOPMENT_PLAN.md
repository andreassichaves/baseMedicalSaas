# Portal SaaS Multi-Produto — Plano de Desenvolvimento

## Resumo do Projeto

**Produto:** Portal SaaS multi-produto com billing unificado.
**SaaS #1:** Inventario de Equipamentos com gestao de manutencoes.
**Modelo de receita:** Assinatura mensal de R$600/cliente.
**Stack:** Next.js + Supabase + Node.js billing service + Stripe.
**Timeline estimada:** 14 semanas para MVP lancavel.

---

## Fase 0 — Setup do Projeto (Semana 1)

**Objetivo:** Estrutura do monorepo pronta, ambientes configurados, CI basico.

### Tasks

- [ ] **0.1** Criar repositorio no GitHub
- [ ] **0.2** Inicializar monorepo com Turborepo
  - `apps/web` — Next.js 15 com App Router
  - `apps/billing-service` — Node.js com Express/Fastify
  - `packages/shared` — Tipos TypeScript compartilhados
- [ ] **0.3** Configurar Next.js
  - TypeScript strict mode
  - Tailwind CSS
  - shadcn/ui (instalar componentes base: Button, Card, Input, Dialog, Table, Dropdown)
  - ESLint + Prettier
- [ ] **0.4** Criar projeto no Supabase
  - Anotar URL e chaves (anon, service_role)
  - Configurar Supabase CLI local (`supabase init`)
- [ ] **0.5** Criar conta Stripe
  - Ativar modo teste
  - Criar produto "Plano Pro" com preco R$600/mes
  - Configurar webhook endpoint (apontar para URL do billing service)
  - Anotar secret key, publishable key, webhook secret
- [ ] **0.6** Configurar variáveis de ambiente
  - `.env.local` para Next.js (SUPABASE_URL, SUPABASE_ANON_KEY, BILLING_SERVICE_URL)
  - `.env` para billing service (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] **0.7** Configurar docker-compose.yml para desenvolvimento local
  - Supabase local (opcional, pode usar hosted)
  - Billing service

**Entregavel:** `turbo dev` sobe frontend e billing service localmente.

---

## Fase 1 — Autenticacao + Portal Shell (Semanas 2-3)

**Objetivo:** Usuario cria conta, faz login, ve o portal com catalogo de SaaS.

### Semana 2 — Auth + Registro

- [ ] **1.1** Criar migration `001_organizations.sql`
  ```sql
  CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    stripe_customer_id text,
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
- [ ] **1.3** Configurar Supabase Auth
  - Habilitar email/senha
  - Configurar redirect URLs
  - Criar JWT hook (`custom_access_token_hook`) para incluir `org_id` e `portal_role` no token
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

## Fase 4 — Billing Service + Stripe (Semanas 10-12)

**Objetivo:** Billing service rodando, integracao Stripe completa, controle de acesso por assinatura.

### Semana 10 — Billing Service Base

- [ ] **4.1** Implementar billing service (Node.js/TypeScript)
  - Express ou Fastify
  - Rota POST `/api/subscriptions/checkout` — cria Stripe Checkout Session
  - Rota POST `/api/subscriptions/portal` — cria Stripe Customer Portal Session
  - Rota GET `/api/subscriptions/status/:orgId` — consulta status
  - Middleware: validar JWT do Supabase em requests autenticados
- [ ] **4.2** Criar migration `007_subscriptions.sql`
  - Tabelas: `subscriptions`, `invoices`, `payment_events`
  - RLS: somente leitura para membros, escrita via service_role
- [ ] **4.3** Implementar processamento de webhooks
  - Rota POST `/api/webhooks/stripe`
  - Verificar assinatura do Stripe (stripe-signature header)
  - Eventos tratados:
    - `checkout.session.completed` → ativar assinatura
    - `invoice.payment_succeeded` → registrar fatura
    - `invoice.payment_failed` → marcar como past_due
    - `customer.subscription.updated` → atualizar plano
    - `customer.subscription.deleted` → cancelar assinatura
  - Registrar evento em `payment_events` (auditoria)
- [ ] **4.4** Dockerfile para billing service
- [ ] **4.5** Deploy do billing service no Fly.io ou Render

### Semana 11 — Telas de Billing

- [ ] **4.6** Implementar pagina `/settings/billing`
  - Status da assinatura (ativa, trial, vencida, cancelada)
  - Dias restantes de trial
  - Botao "Assinar Plano Pro" (redireciona para Stripe Checkout)
  - Botao "Gerenciar Assinatura" (redireciona para Stripe Customer Portal)
  - Historico de faturas (lista com links para PDF do Stripe)
  - Acessivel apenas por `account_owner`, `account_admin`
  - Faturas visiveis para `billing_viewer`
- [ ] **4.7** Implementar controle de acesso por assinatura
  - RLS policy: bloquear acesso a dados se `subscription_status` nao e `active` ou `trialing`
  - Pagina de bloqueio: "Sua assinatura expirou. Contate o administrador."
  - Banner de aviso quando trial esta acabando (ultimos 3 dias)
  - Banner de aviso quando pagamento falhou (past_due)
- [ ] **4.8** Implementar fluxo de trial
  - 14 dias de trial ao criar conta
  - Acesso completo durante trial
  - Ao expirar: bloquear acesso aos SaaS, manter acesso ao portal/billing
  - CTA para assinar na pagina de bloqueio

### Semana 12 — Testes e Robustez

- [ ] **4.9** Testar fluxo completo no Stripe Test Mode
  - Criar assinatura com cartao de teste
  - Simular falha de pagamento
  - Simular cancelamento
  - Verificar que webhooks atualizam corretamente o banco
- [ ] **4.10** Implementar retry para webhooks
  - Se processamento falhar, logar erro e retornar 500 (Stripe faz retry automatico)
  - Dead letter: logar eventos que falharam 3+ vezes para investigacao
- [ ] **4.11** Testar isolamento de billing
  - Org A com assinatura ativa ve seus dados
  - Org B com assinatura cancelada nao ve dados
  - Admin da Org A nao ve faturas da Org B

**Entregavel:** Billing completo. Empresa assina, paga via Stripe, acesso e controlado por status de assinatura.

---

## Fase 5 — Polish + Lancamento (Semanas 13-14)

**Objetivo:** Produto pronto para primeiros clientes.

### Semana 13 — Qualidade

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

### Semana 14 — Deploy e Lancamento

- [ ] **5.6** Deploy producao
  - Vercel: conectar repo, configurar variaveis de ambiente
  - Fly.io/Render: deploy do billing service com variaveis de producao
  - Supabase: rodar migrations no projeto de producao
  - Stripe: configurar webhook com URL de producao
- [ ] **5.7** Dominio e DNS
  - Configurar dominio customizado no Vercel
  - HTTPS automatico
- [ ] **5.8** Monitoramento
  - Logs do billing service (Fly.io logs)
  - Supabase dashboard (queries, auth, storage)
  - Stripe dashboard (MRR, churn, pagamentos)
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
  - Assinar plano (Stripe test mode → live mode)
  - Convidar usuario
  - Testar permissoes por papel

**Entregavel:** Produto em producao, pronto para os primeiros clientes pagantes.

---

## Apos o Lancamento

### Curto prazo (1-2 meses)

- [ ] Feedback dos primeiros clientes
- [ ] Correcao de bugs e ajustes de UX
- [ ] Melhorar relatorios baseado em demanda real
- [ ] Adicionar metodos de pagamento (boleto, PIX)
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
| Billing service cai e perde webhook | Baixa | Alto | Stripe faz retry automatico; dead letter logging |
| Data leak entre tenants | Baixa | Critico | RLS em todas as tabelas + testes de isolamento |
| Stripe nao disponivel no Brasil | Muito baixa | Alto | Stripe opera no Brasil; fallback: Mercado Pago |
| Escopo cresce alem do planejado | Alta | Alto | Manter escopo rigido do MVP; features novas so apos lancamento |

---

Ultima atualizacao: Marco 2026
