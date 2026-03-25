# Estrategia futura — Portal como plataforma para provedores SaaS (repasse / marketplace)

**Status:** Planejamento (nao implementado no MVP atual).  
**Contexto:** O portal hoje e multi-tenant por **cliente final** (empresa que assina e usa os modulos). No futuro, outra empresa pode querer usar **o mesmo portal** para oferecer **os proprios SaaS** aos clientes dela — papel de **provedor** (ou **tenant da plataforma** em um segundo nivel).

Este documento descreve **como o dinheiro pode fluir** e **qual estrategia tecnica** combina com a integracao **Asaas** ja prevista.

---

## 1. Pergunta central: "Recebo tudo e depois repasso?"

**Resposta curta:** Pode ser assim (modelo **agregador**), mas nao e a unica opcao — e nem sempre a melhor quando o volume e a regulacao crescem.

Existem **dois grandes caminhos**:

| Modelo | Ideia | Quando faz sentido |
|--------|--------|-------------------|
| **A — Agregador (liquida tudo na sua conta)** | Todo pagamento cai na **sua** conta Asaas; voce registra comissao e **repassa** ao provedor (manual ou job + transferencias). | MVP de marketplace, poucos provedores, regras simples; equipe aceita operar **ledger** e **repasses** (PIX/TED) com disciplina. |
| **B — Split no gateway (Asaas)** | A cobranca e criada na conta que faz a venda; o Asaas **divide automaticamente** entre carteiras (`walletId`) com **percentual ou valor fixo** sobre o valor liquido. | Varias contas Asaas (subcontas / carteiras dos provedores), repasse **automatico**, menos necessidade de "segurar" todo o caixa antes de repassar. |

**Nao e obrigatorio** "receber tudo e repassar depois". O Asaas oferece **split de pagamentos** na API: ao criar a cobranca, um array `splits` envia parte do valor liquido para a carteira de cada participante. Estornos totais revertem o split automaticamente (comportamento documentado pelo Asaas).

---

## 2. Modelo A — Agregador (recebe tudo, repassa depois)

### Fluxo

1. Cliente final paga assinatura (PIX/boleto/cartao) → **sua** conta Asaas.
2. O **billing service** registra: `gross_amount`, `platform_fee`, `provider_share`, `provider_id`, `period`.
3. Em ciclo (semanal/mensal), voce executa **repasses** (transferencia Asaas, PIX, TED) conforme saldo e conciliacao.
4. Provedor recebe **apos** o dinheiro ja ter entrado na plataforma.

### Vantagens

- **Uma** conta Asaas e **um** fluxo de webhook no MVP estendido.
- Controle total sobre **quando** repassar (ex.: apos contestacao, chargeback, reembolso).
- Comissao e promocoes podem ser calculadas **no seu banco** com flexibilidade.

### Riscos e custos operacionais

- **Regulatorio e contabil:** Voce pode ser enquadrado como intermediador de pagamentos ou ter obrigacoes fiscais especificas ao **receber valores de terceiros**. E necessario validar com **contador e advogado** especializados em pagamentos digitais no Brasil.
- **Fluxo de caixa:** O dinheiro dos provedores passa pela sua conta — exige **ledger** confiavel (tabela de `payouts`, `provider_balances`, conciliacao com extratos Asaas).
- **NFS-e:** Hoje o plano assume NFS-e **da sua empresa** para o servico cobrado. Com provedores, pode ser necessario **emitir nota da plataforma** (comissao) e o provedor emitir a parte dele — ou modelo fiscal acordado com especialista.
- **Suporte a disputas:** Estorno em cartao ou chargeback afeta o saldo; precisa de **politica** de quem absorve e como desconta do provedor.

### Dados minimos a modelar (futuro)

- `saas_providers` (empresa provedora, KYC, status, `asaas_wallet_id` se migrar para split depois).
- `provider_products` ou vinculo produto → provedor + percentual de repasse.
- `ledger_entries` (credito/debito por org, por provedor, por cobranca).
- `payouts` (valor, data, metodo, id externo da transferencia, status).

---

## 3. Modelo B — Split Asaas (repasse no ato do recebimento)

### Fluxo

1. Na criacao da **cobranca** ou **assinatura**, a API inclui `splits`: ex. 15% para `walletId` da plataforma, 85% para `walletId` do provedor (valores ilustrativos).
2. Ao confirmar o pagamento, o Asaas **credita** cada carteira conforme o split (sobre o **valor liquido** apos taxas do Asaas — confirmar regras vigentes na documentacao oficial).
3. Cada participante com carteira propria gerencia **seu** saldo e, se aplicavel, **sua** NFS-e (a modelagem fiscal continua sendo tema de especialista).

### Vantagens

- Menos "dinheiro parado" como passivo operacional na sua conta.
- Repasse **automatico**, escalavel com muitos provedores.
- Alinhado ao que o Asaas descreve para **marketplaces e franquias**.

### Requisitos

- **Subcontas / carteiras:** Cada provedor (ou a operacao) precisa estar habilitado no Asaas com `walletId` para receber split (processo de cadastro e KYC do Asaas).
- **Implementacao:** Somente via **API** (split nao e configurado pela interface web para todos os casos — ver documentacao atual).
- **Assinaturas recorrentes:** Validar na documentacao se split em **todas** as recorrencias da assinatura atende ao caso; ajustar billing service para incluir `splits` em cada ciclo gerado.

### Riscos

- Menos flexibilidade para "segurar" repasse ate fim de trial do provedor, a menos que regras de negocio contemplem isso na propria API (ex.: split 100% plataforma ate liberacao).
- **Nota fiscal:** Quem emite o que para o cliente final precisa estar claro contratual e fiscalmente.

---

## 4. Estrategia recomendada em fases

### Fase 1 — MVP plataforma (antes de ter terceiros cobrando)

- Manter **um** Asaas, **um** tenant por cliente final (`org_id`), assinatura unificada como hoje.

### Fase 2 — Primeiros provedores, poucos parceiros

- **Modelo agregador (A)** com **ledger + repasses programados** pode ser mais rapido de implementar **se** o juridico/contabil aprovar.
- Ou **Modelo B** desde o inicio se o Asaas ja aprovar subcontas dos provedores e o produto for "marketplace puro".

### Fase 3 — Escala

- Migrar ou padronizar no **split (B)** para reduzir risco operacional e trabalho de repasse manual.
- Dashboard do provedor: vendas, comissao da plataforma, extrato, status de payouts (se ainda houver complemento fora do split).

---

## 5. Impacto na arquitetura atual (visao tecnica)

| Area | Ajuste futuro |
|------|----------------|
| **Billing service** | Resolver `provider_id` e `split_rules` a partir do produto/plano; montar payload Asaas com `splits` ou gravar apenas na conta da plataforma + fila de repasse. |
| **Banco** | Tabelas de provedor, comissao, ledger, payouts; possivel `asaas_wallet_id` por provedor. |
| **Webhooks** | Continuar idempotentes; eventos podem precisar atualizar saldo de provedor e de plataforma. |
| **RLS / permissoes** | Novo papel: `provider_admin` enxerga apenas seus produtos e suas financas agregadas (sem vazar dados de outro provedor). |
| **Catalogo** | `saas_products` (ou equivalente) passa a ter `provider_org_id` ou `provider_id` e politica de precos. |

---

## 6. Compliance (checklist nao tecnico)

- Contrato entre **plataforma ↔ provedor** (comissao, prazo de repasse, chargeback, rescisao).
- Contrato entre **provedor ↔ cliente final** (quem e o fornecedor do servico na nota/contrato).
- **LGPD:** Provedor pode ser operador ou controlador em cenarios hibridos — mapear.
- **PCI / dados de pagamento:** Manter tokenizacao e segredos apenas no billing service.

---

## 7. Referencias Asaas (consultar versao atual da doc)

- Split de pagamentos (overview e cobrancas avulsas): documentacao oficial `docs.asaas.com` — secao **Split de pagamentos**.
- Subcontas / carteiras e `walletId`: conforme processo vigente no Asaas.

---

## 8. Resumo executivo

| Pergunta | Resposta |
|----------|----------|
| Preciso receber tudo e repassar? | **Nao e obrigatorio.** E um caminho valido na **Fase 2**; na **Fase 3** o **split Asaas** tende a escalar melhor. |
| O que implementar primeiro no codigo? | **Extensao de modelo de dados** (provedor, comissao, ledger) e **uma** politica clara de cobranca antes de automatizar split. |
| O que nao pode faltar? | **Parecer juridico/contabil** antes de movimentar dinheiro de terceiros em nome da plataforma. |

---

Ultima atualizacao: Marco 2026
