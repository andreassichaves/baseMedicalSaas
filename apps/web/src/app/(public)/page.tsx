import { ArrowRight, Package, Shield, BarChart3, Wrench, Clock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

const features = [
  {
    icon: Package,
    title: "Inventário Completo",
    description: "Cadastre e gerencie todos os seus equipamentos com categorias, localizações e fotos.",
  },
  {
    icon: Wrench,
    title: "Manutenções",
    description: "Registre manutenções preventivas e corretivas com histórico completo.",
  },
  {
    icon: Clock,
    title: "Agendamentos",
    description: "Configure manutenções recorrentes e receba alertas antes do vencimento.",
  },
  {
    icon: BarChart3,
    title: "Relatórios",
    description: "Visualize dashboards com métricas de custos, frequência e status dos equipamentos.",
  },
  {
    icon: Users,
    title: "Multi-usuários",
    description: "Convide sua equipe com controle granular de permissões por função.",
  },
  {
    icon: Shield,
    title: "Segurança",
    description: "Dados isolados por empresa com criptografia e controle de acesso robusto.",
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
            Gerencie seus equipamentos e manutenções em um só lugar
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Portal completo para inventário de equipamentos com gestão de
            manutenções preventivas e corretivas. Controle total para sua equipe.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <LinkButton href="/register" size="lg">
              Começar grátis por 14 dias
              <ArrowRight className="ml-2 h-4 w-4" />
            </LinkButton>
            <LinkButton href="/features" size="lg" variant="outline">
              Ver funcionalidades
            </LinkButton>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sem cartão de crédito. Cancele a qualquer momento.
          </p>
        </div>
      </section>

      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Tudo que você precisa para gestão de equipamentos
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para organizar seus equipamentos?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Junte-se às empresas que já utilizam o Portal SaaS para gerenciar
            seus equipamentos e manutenções de forma inteligente.
          </p>
          <LinkButton href="/register" size="lg">
            Criar conta gratuita
            <ArrowRight className="ml-2 h-4 w-4" />
          </LinkButton>
        </div>
      </section>
    </>
  );
}
