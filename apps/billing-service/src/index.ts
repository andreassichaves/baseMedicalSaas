import express from "express";
import { subscriptionRoutes } from "./routes/subscriptions";
import { webhookRoutes } from "./routes/webhooks";

const app = express();

app.use("/api/webhooks", webhookRoutes);

app.use(express.json());
app.use("/api/subscriptions", subscriptionRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "billing-service" });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Billing service running on port ${PORT}`);
});
