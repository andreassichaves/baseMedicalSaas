# Portal SaaS Multi-Produto — Decisoes Tecnicas

## 1. Stack Principal

### Frontend: Next.js 15 + TypeScript

**Decisao:** Usar Next.js como framework frontend e unico ponto de entrada da aplicacao web.

**Justificativa:**
- Server-Side Rendering (SSR) para area publica — essencial para SEO e performance de landing page
- App Router com layouts aninhados — ideal para separar area publica, auth e portal
- API Routes server-side — callback de auth, proxies seguros
- React Server Components — reduz JavaScript enviado ao browser
- Ecossistema maduro com shadcn/ui, Tailwind CSS, Framer Motion
- Deploy trivial no Vercel (free tier suficiente para inicio)

**Alternativas descartadas:**
- Vite + React SPA: sem SSR nativo, SEO da landing page prejudicado
- Remix: menor ecossistema e comunidade
- Astro: otimo para sites estaticos, mas limitado para aplicacao interativa

---

### Backend de Dados: Supabase (PostgreSQL)

**Decisao:** Usar Supabase como backend principal para auth, banco de dados, storage e funcoes serverless.

**Justificativa:**
- PostgreSQL completo (sem limitacoes de NoSQL)
- Row Level Security (RLS) nativo — isolamento multi-tenant direto no banco
- Supabase Auth integrado — login, registro, JWT, refresh tokens
- Storage gerenciado — fotos de equipamentos sem configurar S3
- Edge Functions — cron jobs para alertas de manutencao
- Realtime — notificacoes e dashboards ao vivo (futuro)
- SDK TypeScript de qualidade — tipagem forte, queries builder
- Free tier generoso: 500MB banco, 1GB storage, 50k MAU
- Migracao futura para AWS e direta (PostgreSQL padrao, ver secao 8)

**Alternativas descartadas:**
- Firebase: NoSQL (Firestore) dificulta queries relacionais complexas; vendor lock-in forte
- PlanetScale: MySQL (incompativel com RLS nativo do PostgreSQL)
- Backend proprio (Java/Go) + PostgreSQL direto: overkill para MVP, custo de hosting

---

### Billing Service: Node.js / TypeScript (separado)

**Decisao:** Criar um microservico Node.js dedicado exclusivamente a billing, separado do frontend Next.js.

**Justificativa:**
- Separacao de responsabilidades: billing nao compete com UI por recursos
- Deploy independente: atualizacao de billing nao requer redeploy do frontend
- Resiliencia: se o frontend cair, webhooks do Stripe continuam sendo processados
- Retry e filas: controle fino sobre reprocessamento de webhooks falhados
- Auditoria: logs de pagamento centralizados e independentes
- Multi-SaaS futuro: quando houver SaaS #2 e #3, o billing service ja esta pronto para atende-los
- Seguranca: Stripe secret key isolada em um unico servico

**Por que Node.js e nao Go:**
- Mesmo ecossistema TypeScript do frontend — menos contexto mental para trocar
- Stripe SDK identico (`stripe` npm package)
- Tipos compartilhados via monorepo (`packages/shared`)
- Para billing isolado, a vantagem de performance do Go nao justifica a curva de aprendizado
- Se no futuro um backend de dominio pesado for necessario (processamento de dados, relatorios massivos), Go entra como servico separado

**Por que nao API Routes do Next.js:**
- API Routes do Next.js sao server-side e tecnicamente seguras
- Porem, acoplam billing ao deploy do frontend
- Webhook processing compete com requests de UI
- Sem mecanismo de retry proprio
- Escala junto com o frontend (ineficiente — billing tem perfil de carga diferente)
- Para um produto a R$600/mes, billing precisa ser robusto e independente

---

### Pagamentos: Stripe

**Decisao:** Usar Stripe como processador de pagamentos.

**Justificativa:**
- Suporte completo a Brasil: cartao, boleto, PIX
- Checkout hosted: pagina de pagamento pronta, sem preocupacao com PCI compliance
- Customer Portal: gestao de assinatura pelo cliente sem desenvolver UI
- Webhooks confiaveis com retry automatico
- Tax management (emissao de notas no futuro)
- Dashboard de metricas financeiras (MRR, churn, etc.)
- SDK maduro para Node.js

**Alternativas descartadas:**
- Mercado Pago: bom para Brasil, porem API menos madura para SaaS com subscription management
- PagSeguro/PagBank: limitado em funcionalidades de subscription
- Implementacao propria: inviavel (PCI compliance, regulacao, fraude)

---

## 2. Arquitetura Multi-Tenant

### Estrategia: Coluna `org_id` (tenant_id)

**Decisao:** Usar isolamento por coluna `org_id` em todas as tabelas de dados.

**Justificativa:**
- Simples de implementar e manter
- Suficiente para ate ~500 tenants com performance adequada
- Compativel com RLS do PostgreSQL — isolamento no nivel do banco
- Migrations aplicam a todos os tenants de uma vez
- Custo de infra minimo (um unico banco)

**Trade-offs conhecidos:**
- Risco de data leak se RLS nao estiver configurado corretamente em alguma tabela
- Queries pesadas de um tenant podem impactar outros (sem isolamento de recursos)
- Backup e restauracao sao globais (nao por tenant)

**Mitigacao:**
- RLS habilitado em TODAS as tabelas com dados de tenant, sem excecao
- Testes automatizados que verificam isolamento (query de um tenant nao retorna dados de outro)
- Indice em `org_id` em todas as tabelas para performance

**Estrategias futuras (quando necessario):**
- Schema por tenant: quando houver exigencia regulatoria (saude, financeiro)
- Database por tenant: quando um cliente grande justificar isolamento total
- A migracao de coluna para schema e incrementar — nao exige reescrever a aplicacao

---

## 3. Sistema de Permissoes — RBAC Dual

### Decisao: Separar Portal Roles de SaaS Roles

**Justificativa:**
- Sao dominios diferentes: quem paga a conta != quem usa o produto
- Portal Roles sao poucos e fixos (4 papeis) — nao precisam de customizacao
- SaaS Roles sao granulares e customizaveis por empresa — precisam de flexibilidade
- Um usuario pode ser `account_owner` no portal e nao ter acesso a nenhum SaaS
- Um usuario pode ser `saas_admin` no SaaS #1 e `viewer` no SaaS #2
- Novos produtos SaaS adicionam suas proprias permissions sem alterar o sistema de portal

**Alternativa descartada — RBAC unico:**
- Misturar billing e produto num unico sistema de roles forçaria roles hibridos
- Ex: "Admin" teria que ter permissions de billing E de equipamentos — nem sempre desejavel
- Cada novo SaaS poluiria a lista de permissions de todos os papeis

**Alternativa descartada — ACL (Access Control List):**
- ACL define permissoes por usuario por recurso — granularidade excessiva para este caso
- Gestao se torna inviavel com centenas de equipamentos
- RBAC com roles customizaveis atinge o mesmo resultado com menos complexidade

### Verificacao de permissoes

| Camada | O que verifica |
|--------|---------------|
| PostgreSQL RLS | Isolamento por `org_id` + assinatura ativa |
| Funcao SQL `has_permission()` | Se o usuario tem a permission especifica no produto |
| Middleware Next.js | Portal role para rotas de settings/billing |
| Hook React `usePermissions()` | Esconde/exibe botoes e acoes na UI |

A verificacao e em cascata: RLS bloqueia no banco, middleware bloqueia na rota, UI esconde na interface. Defesa em profundidade.

---

## 4. Monorepo com Turborepo

**Decisao:** Organizar o projeto como monorepo com Turborepo.

**Justificativa:**
- Frontend e billing service compartilham tipos TypeScript (`packages/shared`)
- Mudanca em tipos e validada em ambos os projetos no mesmo commit
- Build paralelo (Turborepo): `turbo build` compila frontend e billing service simultaneamente
- Um unico repositorio para gerenciar, uma unica PR para features cross-cutting

**Alternativa descartada — repos separados:**
- Tipos duplicados entre repos divergem com o tempo
- Coordenacao de releases entre repos e onerosa
- Para uma equipe pequena (1-3 devs), monorepo e mais eficiente

---

## 5. UI: Tailwind CSS + shadcn/ui

**Decisao:** Usar Tailwind CSS com shadcn/ui como biblioteca de componentes.

**Justificativa:**
- shadcn/ui: componentes acessiveis (Radix UI) com controle total sobre o codigo
- Tailwind CSS: utility-first, sem conflito de especificidade, purge automatico
- Consistencia visual com design tokens via CSS variables
- Componentes copiados (nao instalados via npm) — sem dependencia de versao externa

**Alternativas descartadas:**
- MUI: pesado, difícil de customizar profundamente, opinionated demais
- Chakra UI: bom, mas menor ecossistema que shadcn/ui em 2026
- CSS Modules: sem design system out-of-the-box

---

## 6. Autenticacao: Supabase Auth

**Decisao:** Usar Supabase Auth para autenticacao, com JWT customizado via hook.

**Justificativa:**
- Integrado ao PostgreSQL (auth.users e referenciavel por FKs)
- JWT customizavel via hooks (para incluir `org_id` e `portal_role`)
- Suporta email/senha, magic link, e OAuth (Google, GitHub — futuro)
- Refresh token rotation automatico
- Row Level Security integrado (auth.jwt() disponivel nas policies)
- Nao precisa implementar: hash de senha, rate limiting de login, email verification

**Alternativas descartadas:**
- Auth proprio (JWT + bcrypt): funcional mas requer implementar tudo (reset password, email verification, rate limiting, etc.)
- Auth0/Clerk: excelentes, porem custo por MAU em escala e vendor lock-in
- Keycloak: complexo demais para o tamanho do projeto

---

## 7. Hosting Inicial

### Frontend: Vercel (Hobby Plan)

**Justificativa:**
- Deploy automatico via GitHub
- CDN global com Edge Network
- HTTPS automatico
- Preview deployments para PRs
- Custo: $0

### Billing Service: Fly.io ou Render

**Justificativa:**
- Deploy via Dockerfile
- Free tier suficiente para billing (baixo volume de requests)
- Regiao Brasil disponivel (Fly.io: `gru`, Render: `oregon` mais proximo)
- Custo: $0

### Banco de Dados: Supabase (Free Plan)

**Justificativa:**
- 500MB de banco, 1GB de storage, 50k MAU
- Suficiente para os primeiros ~10-20 clientes
- Upgrade para Pro ($25/mes) quando necessario
- Custo: $0

### Custo total inicial: $0 + taxas do Stripe por transacao

---

## 8. Estrategia de Migracao para AWS

A stack foi escolhida para ser portavel. Nenhuma decisao cria vendor lock-in significativo.

| Componente | Migracao para AWS | Complexidade |
|-----------|-------------------|-------------|
| Next.js (Vercel) | AWS Amplify ou ECS Fargate | Baixa |
| Billing Service (Fly.io) | ECS Fargate ou App Runner | Baixa (container) |
| PostgreSQL (Supabase) | RDS PostgreSQL | Baixa (pg_dump/pg_restore) |
| Supabase Auth | Manter como servico externo ou migrar para Cognito | Media |
| Supabase Storage | S3 | Baixa |
| Stripe | Stripe (sem mudanca) | Zero |
| RLS policies | Funcionam identicamente no RDS (feature do PostgreSQL) | Zero |

**Recomendacao:** ao migrar, manter Supabase Auth como servico externo (continua funcionando apontado para RDS). Isso elimina a necessidade de migrar auth e minimiza mudancas no frontend.

**Tempo estimado de migracao completa:** ~1 semana.

---

## 9. Decisoes de Desenvolvimento

### TypeScript Strict Mode

Habilitado em todos os projetos. Nao negociavel. Previne bugs em tempo de compilacao.

### Conventional Commits

Formato de commit padronizado para changelog automatico:
- `feat:` nova funcionalidade
- `fix:` correcao de bug
- `refactor:` reestruturacao sem mudanca funcional
- `docs:` documentacao
- `chore:` tarefas de manutencao

### Branching: main + develop

- `main`: producao, sempre estavel
- `develop`: desenvolvimento ativo
- Feature branches a partir de `develop`

### Testes

- Fase MVP: testes manuais + testes de RLS (isolamento de tenant)
- Fase 2+: testes automatizados (Vitest para unitarios, Playwright para E2E)

---

## Registro de Decisoes

| Data | Decisao | Contexto |
|------|---------|----------|
| Mar 2026 | Supabase como backend principal | Custo zero, PostgreSQL padrao, RLS nativo |
| Mar 2026 | Billing service separado em Node.js | Independencia do frontend, robustez para R$600/mes |
| Mar 2026 | RBAC dual (portal vs SaaS) | Separar quem paga de quem usa |
| Mar 2026 | Multi-tenant por coluna org_id | Simplicidade para <500 tenants |
| Mar 2026 | Next.js 15 com App Router | SSR para SEO + App Router para layouts complexos |
| Mar 2026 | Monorepo com Turborepo | Tipos compartilhados, build paralelo |
| Mar 2026 | Stripe para pagamentos | Suporte Brasil (cartao, boleto, PIX), checkout hosted |

---

Ultima atualizacao: Marco 2026
