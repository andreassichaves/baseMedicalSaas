import { SupabaseBillingPersistence } from "../adapters/supabase/supabase-billing.persistence";
import { AsaasBillingGateway } from "../adapters/asaas/asaas.gateway";
import { PagarmeBillingGateway } from "../adapters/pagarme/pagarme.gateway";
import { BillingApplication } from "../application/billing.application";
import { supabase } from "../services/supabase.service";

let cached: BillingApplication | null = null;

/**
 * BILLING_PROVIDER=asaas (padrao) | pagarme
 * Troca apenas variaveis de ambiente e reinicia o servico.
 */
export function getBillingApplication(): BillingApplication {
  if (cached) return cached;

  const persistence = new SupabaseBillingPersistence(supabase);
  const provider = (process.env.BILLING_PROVIDER ?? "asaas").toLowerCase().trim();

  const gateway =
    provider === "pagarme"
      ? new PagarmeBillingGateway()
      : new AsaasBillingGateway();

  cached = new BillingApplication(persistence, gateway);
  return cached;
}
