import { Router } from "express";
import { getBillingApplication } from "../composition/wiring";

export const subscriptionRoutes = Router();

subscriptionRoutes.post("/create", async (req, res) => {
  try {
    const {
      orgId,
      paymentMethod,
      card,
      customerName,
      customerEmail,
      customerDocument,
    } = req.body;

    if (
      !orgId ||
      !paymentMethod ||
      !customerName ||
      !customerEmail ||
      !customerDocument
    ) {
      res.status(400).json({
        error:
          "orgId, paymentMethod, customerName, customerEmail, and customerDocument are required",
      });
      return;
    }

    if (
      paymentMethod !== "credit_card" &&
      paymentMethod !== "boleto" &&
      paymentMethod !== "pix"
    ) {
      res.status(400).json({
        error: "paymentMethod must be credit_card, boleto, or pix",
      });
      return;
    }

    const app = getBillingApplication();
    const result = await app.createSubscription({
      orgId,
      paymentMethod,
      card,
      customer: {
        name: customerName,
        email: customerEmail,
        document: customerDocument,
      },
    });

    res.json({
      subscription_id: result.subscription_id,
      status: result.status,
      provider: app.activeProvider,
      boleto_url: result.boleto_url,
      boleto_barcode: result.boleto_barcode,
      pix_qr_code: result.pix_qr_code,
      pix_copy_paste: result.pix_copy_paste,
    });
  } catch (error) {
    console.error("Create subscription error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create subscription";
    res.status(500).json({ error: message });
  }
});

subscriptionRoutes.post("/cancel", async (req, res) => {
  try {
    const { orgId } = req.body;

    if (!orgId) {
      res.status(400).json({ error: "orgId is required" });
      return;
    }

    await getBillingApplication().cancelSubscription(orgId);
    res.json({ status: "canceled" });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to cancel subscription";
    res.status(500).json({ error: message });
  }
});

subscriptionRoutes.post("/update-payment", async (req, res) => {
  try {
    const { orgId, card } = req.body;

    if (!orgId || !card) {
      res.status(400).json({ error: "orgId and card are required" });
      return;
    }

    await getBillingApplication().updatePayment(orgId, card);
    res.json({ status: "updated" });
  } catch (error) {
    console.error("Update payment error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update payment method";
    res.status(500).json({ error: message });
  }
});

subscriptionRoutes.get("/status/:orgId", async (req, res) => {
  try {
    const { orgId } = req.params;
    const status = await getBillingApplication().getStatus(orgId);

    if (!status) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    res.json(status);
  } catch (error) {
    console.error("Status error:", error);
    res.status(500).json({ error: "Failed to get subscription status" });
  }
});

subscriptionRoutes.get("/invoices/:orgId", async (req, res) => {
  try {
    const { orgId } = req.params;
    const { supabase } = await import("../services/supabase.service");

    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    res.json(invoices ?? []);
  } catch (error) {
    console.error("Invoices error:", error);
    res.status(500).json({ error: "Failed to list invoices" });
  }
});

subscriptionRoutes.get("/provider", (_req, res) => {
  res.json({ provider: getBillingApplication().activeProvider });
});
