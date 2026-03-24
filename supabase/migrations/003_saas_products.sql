CREATE TABLE saas_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon_url text,
  is_active boolean NOT NULL DEFAULT false,
  is_coming_soon boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0
);

INSERT INTO saas_products (name, slug, description, is_active, is_coming_soon, display_order)
VALUES
  (
    'Inventário de Equipamentos',
    'equipment-inventory',
    'Gerencie seus equipamentos e manutenções preventivas e corretivas.',
    true, false, 1
  ),
  (
    'Prontuário Eletrônico',
    'electronic-health-record',
    'Gestão completa de prontuários de pacientes.',
    false, true, 2
  ),
  (
    'Inteligência de Dados',
    'data-intelligence',
    'Dashboards e análises avançadas dos seus dados.',
    false, true, 3
  );
