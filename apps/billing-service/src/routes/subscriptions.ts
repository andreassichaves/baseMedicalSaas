import { Router } from "express";
import { stripe } from "../services/stripe.service";
import { supabase } from "../services/supabase.service";

export const subscriptionRoutes = Router();

subscriptionRoutes.post("/checkout", async (req, res) => {
  try {
    const { orgId, priceId } = req.body;

    if (!orgId || !priceId) {
      res.status(400).json({ error: "orgId and priceId are required" });
      return;
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, stripe_customer_id")
      .eq("id", orgId)
      .single();

    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    let customerId = org.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { orgId: org.id },
      });
      customerId = customer.id;

      await supabase
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", orgId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { orgId },
      success_url: `${process.env.FRONTEND_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.FRONTEND_URL}/settings/billing?checkout=canceled`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

subscriptionRoutes.post("/portal", async (req, res) => {
  try {
    const { stripeCustomerId } = req.body;

    if (!stripeCustomerId) {
      res.status(400).json({ error: "stripeCustomerId is required" });
      return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/settings/billing`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

subscriptionRoutes.get("/status/:orgId", async (req, res) => {
  try {
    const { orgId } = req.params;

    const { data: org } = await supabase
      .from("organizations")
      .select("subscription_status, plan, trial_ends_at")
      .eq("id", orgId)
      .single();

    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    res.json(org);
  } catch (error) {
    console.error("Status error:", error);
    res.status(500).json({ error: "Failed to get subscription status" });
  }
});
