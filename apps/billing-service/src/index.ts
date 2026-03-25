import express from "express";
import { subscriptionRoutes } from "./routes/subscriptions";
import { webhookRoutes } from "./routes/webhooks";
import { getBillingApplication } from "./composition/wiring";

const app = express();

app.use("/api/webhooks", webhookRoutes);

app.use(express.json());
app.use("/api/subscriptions", subscriptionRoutes);

app.get("/health", (_req, res) => {
  const billing = getBillingApplication();
  res.json({
    status: "ok",
    service: "billing-service",
    billing_provider: billing.activeProvider,
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  const provider = process.env.BILLING_PROVIDER ?? "asaas";
  console.log(`Billing service on port ${PORT} (BILLING_PROVIDER=${provider})`);
});
