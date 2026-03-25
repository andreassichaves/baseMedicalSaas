import { Check, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

const includedFeatures = [
  "Equipamentos ilimitados",
  "Manutenções ilimitadas",
  "Agendamentos recorrentes",
  "Alertas de manutenção",
  "Relatórios e dashboards",
  "Multi-usuários com permissões granulares",
  "Upload de fotos e anexos",
  "Exportação CSV",
  "Suporte por email",
  "Dados isolados e seguros",
];

export default function PricingPage() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">
            Plano simples, sem surpresas
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Um único plano com acesso completo a todas as funcionalidades.
            Comece com 14 dias grátis.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="border-primary">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Plano Pro</CardTitle>
              <CardDescription>Para empresas de qualquer tamanho</CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold">R$600</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {includedFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <LinkButton href="/register" size="lg" className="w-full">
                Começar grátis por 14 dias
                <ArrowRight className="ml-2 h-4 w-4" />
              </LinkButton>
            </CardFooter>
          </Card>
          <p className="text-center mt-4 text-xs text-muted-foreground">
            Sem cartão de crédito para o trial. Cancele a qualquer momento.
          </p>
        </div>
      </div>
    </section>
  );
}
