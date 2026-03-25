import {
  Package, Wrench, Clock, BarChart3, Users, Shield,
  ArrowRight, Camera, FileText, Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

const featureGroups = [
  {
    title: "Inventário de Equipamentos",
    features: [
      { icon: Package, title: "Cadastro completo", description: "Nome, número de série, categoria, localização, data de aquisição, custo e status." },
      { icon: Camera, title: "Fotos e anexos", description: "Adicione fotos dos equipamentos e documentos relevantes." },
      { icon: FileText, title: "Campos customizados", description: "Adapte o cadastro às necessidades específicas da sua empresa." },
    ],
  },
  {
    title: "Gestão de Manutenções",
    features: [
      { icon: Wrench, title: "Preventiva e corretiva", description: "Registre manutenções por tipo com descrição, custo e técnico responsável." },
      { icon: Clock, title: "Agendamentos recorrentes", description: "Configure frequência (dias, semanas, meses) e receba alertas automáticos." },
      { icon: Bell, title: "Alertas inteligentes", description: "Notificações quando uma manutenção está próxima do vencimento." },
    ],
  },
  {
    title: "Relatórios e Controle",
    features: [
      { icon: BarChart3, title: "Dashboard visual", description: "Métricas de custos, equipamentos por status e manutenções realizadas." },
      { icon: Users, title: "Permissões granulares", description: "Defina exatamente o que cada membro da equipe pode fazer." },
      { icon: Shield, title: "Segurança empresarial", description: "Dados isolados por empresa, criptografia e controle de acesso robusto." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight">Funcionalidades</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Tudo que você precisa para gerenciar equipamentos e manutenções
            de forma profissional.
          </p>
        </div>

        <div className="space-y-16">
          {featureGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-2xl font-bold mb-6">{group.title}</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.features.map((feature) => (
                  <Card key={feature.title}>
                    <CardHeader>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-base">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <LinkButton href="/register" size="lg">
            Começar grátis por 14 dias
            <ArrowRight className="ml-2 h-4 w-4" />
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
