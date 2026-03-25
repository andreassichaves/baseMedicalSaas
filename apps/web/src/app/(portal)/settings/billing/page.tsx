"use client";

import { CreditCard } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsBillingPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assinatura</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua assinatura e pagamentos.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status da assinatura</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">Trial ativo</p>
          <Button type="button" variant="default">
            Assinar Plano Pro
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
