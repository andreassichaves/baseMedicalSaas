import { Router, raw } from "express";
import crypto from "node:crypto";
import { SupabaseBillingPersistence } from "../adapters/supabase/supabase-billing.persistence";
/**
 * Webhook Asaas tambem pode ser servido pela Edge Function `supabase/functions/asaas-webhook`
 * (URL publica HTTPS sem ngrok). Nao configures o mesmo evento em duas URLs — evita duplicar
 * `payment_events` e efeitos colaterais.
 */
import { verifyAsaasWebhook, parseAsaasWebhookPayload } from "../adapters/asaas/asaas.webhook";
import {
  verifyPagarmeSignature,
  parsePagarmeWebhookPayload,
} from "../adapters/pagarme/pagarme.webhook";
import { supabase } from "../services/supabase.service";
import type { BillingDomainEvent } from "../domain/billing-events";

export const webhookRoutes = Router();

const persistence = new SupabaseBillingPersistence(supabase);

function firstCustomerId(events: BillingDomainEvent[]): string | null {
  for (const e of events) {
    if ("externalCustomerId" in e && e.externalCustomerId) {
      return e.externalCustomerId;
    }
  }
  return null;
}

webhookRoutes.post(
  "/asaas",
  raw({ type: "application/json" }),
  async (req, res) => {
    if (!verifyAsaasWebhook(req.headers as Record<string, string | string[] | undefined>)) {
      res.status(401).send("Invalid webhook token");
      return;
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(req.body.toString());
    } catch {
      res.status(400).send("Invalid JSON");
      return;
    }

    const { events, eventType, eventId } = parseAsaasWebhookPayload(body);

    try {
      if (events.length > 0) {
        await persistence.applyDomainEvents(events);
      }

      const customerId = firstCustomerId(events);
      const orgId = customerId
        ? await persistence.findOrgIdByExternalCustomerId(customerId)
        : null;

      await persistence.insertPaymentEvent({
        org_id: orgId,
        external_event_id: `asaas_${eventId}_${crypto.randomUUID().slice(0, 8)}`,
        event_type: eventType,
        payload: body,
      });

      res.json({ received: true });
    } catch (error) {
      console.error("Asaas webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

webhookRoutes.post(
  "/pagarme",
  raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["x-hub-signature"] as string | undefined;

    if (!verifyPagarmeSignature(req.body, signature)) {
      res.status(400).send("Invalid signature");
      return;
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(req.body.toString());
    } catch {
      res.status(400).send("Invalid JSON");
      return;
    }

    const { events, eventType, eventId } = parsePagarmeWebhookPayload(body);

    try {
      if (events.length > 0) {
        await persistence.applyDomainEvents(events);
      }

      const customerId = firstCustomerId(events);
      const orgId = customerId
        ? await persistence.findOrgIdByExternalCustomerId(customerId)
        : null;

      await persistence.insertPaymentEvent({
        org_id: orgId,
        external_event_id: eventId,
        event_type: eventType,
        payload: body.data && typeof body.data === "object"
          ? (body.data as Record<string, unknown>)
          : body,
      });

      res.json({ received: true });
    } catch (error) {
      console.error("Pagarme webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);
