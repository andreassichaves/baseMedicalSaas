import { Router, raw } from "express";
import Stripe from "stripe";
import { stripe } from "../services/stripe.service";
import { supabase } from "../services/supabase.service";

export const webhookRoutes = Router();

webhookRoutes.post(
  "/stripe",
  raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      res.status(400).send("Missing signature or webhook secret");
      return;
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      res.status(400).send("Invalid signature");
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const orgId = session.metadata?.orgId;
          if (orgId) {
            await supabase
              .from("organizations")
              .update({
                stripe_customer_id: session.customer as string,
                subscription_status: "active",
                plan: "pro",
              })
              .eq("id", orgId);

            await supabase.from("subscriptions").insert({
              org_id: orgId,
              stripe_subscription_id: session.subscription as string,
              status: "active",
              plan: "pro",
            });
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;

          const { data: org } = await supabase
            .from("organizations")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (org) {
            await supabase.from("invoices").insert({
              org_id: org.id,
              stripe_invoice_id: invoice.id,
              amount_cents: invoice.amount_paid,
              currency: invoice.currency,
              status: "paid",
              hosted_invoice_url: invoice.hosted_invoice_url,
              period_start: new Date((invoice.period_start ?? 0) * 1000).toISOString(),
              period_end: new Date((invoice.period_end ?? 0) * 1000).toISOString(),
            });
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;

          await supabase
            .from("organizations")
            .update({ subscription_status: "past_due" })
            .eq("stripe_customer_id", customerId);
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          await supabase
            .from("organizations")
            .update({ subscription_status: subscription.status })
            .eq("stripe_customer_id", customerId);

          await supabase
            .from("subscriptions")
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id);
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          await supabase
            .from("organizations")
            .update({ subscription_status: "canceled", plan: "free" })
            .eq("stripe_customer_id", customerId);

          await supabase
            .from("subscriptions")
            .update({
              status: "canceled",
              canceled_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id);
          break;
        }
      }

      await supabase.from("payment_events").insert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event.data.object as Record<string, unknown>,
      });

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);
