export type EventStatus = "pending" | "approved";

export type EventRecurrence =
  | { type: "single" }
  | {
      type: "weekly";
      dayOfWeek: number; // 0=Sunday..6=Saturday
      generateWeeks: number;
    }
  | {
      type: "monthly";
      dayOfMonth: number; // 1..31
      generateMonths: number;
    }
  | {
      type: "annual";
      month: number; // 1..12
      day: number; // 1..31
      generateYears: number;
    }
  | {
      type: "specific";
      dates: string[]; // ISO dates
    };

export type Event = {
  id: string;
  slug: string;
  title: string;
  description: string;
  city: string;
  state: string;
  location: string;
  startAt: string;
  endAt?: string; // For multi-day events
  status: EventStatus;
  recurrence: EventRecurrence;
  websiteUrl?: string;
  coverImage?: string;
};

export type PastEvent = {
  id: string;
  slug: string;
  title: string;
  city: string;
  state: string;
  date: string;
  images: string[];
};

export type ListingStatus = "pending" | "approved" | "active" | "inactive" | "sold" | "rejected";

export type Listing = {
  id: string;
  slug: string;
  title: string;
  year: number;
  make: string;
  model: string;
  city: string;
  state: string;
  price: number;
  description: string;
  status: ListingStatus;
  createdAt: string;
  featured: boolean;
  featuredUntil?: string;
  images: string[];
};

export type NewsArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  coverImage: string;
  publishedAt: string;
};

export type Banner = {
  id: string;
  image: string;
  href: string;
  label: string;
  target: "home" | "eventos" | "classificados" | "noticias";
};

function isoDaysFromNow(days: number, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function isoDaysAgo(days: number, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const homeConfig = {
  heroTitle: "Auto Garage Show",
  heroSubtitle:
    "Calendário de encontros, classificados e notícias de carros antigos — com foco em credibilidade e boa experiência.",
  youtubeEmbedUrl: "https://www.youtube.com/embed/5qap5aO4i9A"
};

export const banners: Banner[] = [
  {
    id: "b1",
    image: "/placeholders/banner.svg",
    href: "https://www.mercadopago.com.br/",
    label: "Banner de exemplo (anunciante)",
    target: "home"
  }
];

export const events: Event[] = [
  {
    id: "e1",
    slug: "encontro-classicos-sao-paulo",
    title: "Encontro de Clássicos – São Paulo",
    description:
      "Encontro aberto ao público com exposição de veículos antigos e praça de alimentação. Evento com curadoria e aprovação manual.",
    city: "São Paulo",
    state: "SP",
    location: "Parque Ibirapuera (Portão 7)",
    startAt: isoDaysFromNow(4, 9),
    status: "approved",
    recurrence: {
      type: "monthly",
      dayOfMonth: 1,
      generateMonths: 12
    },
    websiteUrl: "https://www.encontrosdecarrosantigos.com.br/"
  },
  {
    id: "e2",
    slug: "encontro-vintage-curitiba",
    title: "Encontro Vintage – Curitiba",
    description:
      "Edição especial com clubes convidados, sorteios e área para fotos. Entrada gratuita.",
    city: "Curitiba",
    state: "PR",
    location: "Largo da Ordem",
    startAt: isoDaysFromNow(12, 10),
    status: "approved",
    recurrence: { type: "single" }
  },
  {
    id: "e3",
    slug: "encontro-mensal-bh",
    title: "Encontro Mensal – Belo Horizonte",
    description:
      "Encontro mensal para carros antigos (10+ anos), com área segura e regras de convivência.",
    city: "Belo Horizonte",
    state: "MG",
    location: "Praça da Liberdade",
    startAt: isoDaysFromNow(24, 9),
    status: "approved",
    recurrence: {
      type: "monthly",
      dayOfMonth: 2,
      generateMonths: 12
    }
  },
  {
    id: "e4",
    slug: "encontro-pendente-porto-alegre",
    title: "Encontro (pendente) – Porto Alegre",
    description:
      "Exemplo de evento aguardando aprovação. Não deve gerar página pública no portal.",
    city: "Porto Alegre",
    state: "RS",
    location: "Orla do Guaíba",
    startAt: isoDaysFromNow(7, 9),
    status: "pending",
    recurrence: { type: "single" }
  }
];

export const pastEvents: PastEvent[] = [
  {
    id: "p1",
    slug: "galeria-encontro-ibira",
    title: "Encontro no Ibirapuera",
    city: "São Paulo",
    state: "SP",
    date: isoDaysAgo(14, 9),
    images: [
      "/placeholders/event.svg",
      "/placeholders/event.svg",
      "/placeholders/event.svg",
      "/placeholders/event.svg",
      "/placeholders/event.svg",
      "/placeholders/event.svg"
    ]
  },
  {
    id: "p2",
    slug: "galeria-encontro-curitiba",
    title: "Encontro Vintage Curitiba",
    city: "Curitiba",
    state: "PR",
    date: isoDaysAgo(35, 10),
    images: [
      "/placeholders/event.svg",
      "/placeholders/event.svg",
      "/placeholders/event.svg",
      "/placeholders/event.svg"
    ]
  }
];

export const listings: Listing[] = [
  {
    id: "l1",
    slug: "chevrolet-opala-1978-coupe",
    title: "Chevrolet Opala 1978 Coupé",
    year: 1978,
    make: "Chevrolet",
    model: "Opala",
    city: "Campinas",
    state: "SP",
    price: 79000,
    description:
      "Veículo muito bem conservado, interior original, documentação em dia. Exemplo de anúncio aprovado com imagens otimizadas.",
    status: "approved",
    createdAt: isoDaysAgo(12, 10),
    featured: true,
    featuredUntil: isoDaysFromNow(7, 10),
    images: [
      "/placeholders/car.svg",
      "/placeholders/car.svg",
      "/placeholders/car.svg",
      "/placeholders/car.svg"
    ]
  },
  {
    id: "l2",
    slug: "volkswagen-fusca-1972",
    title: "Volkswagen Fusca 1972",
    year: 1972,
    make: "Volkswagen",
    model: "Fusca",
    city: "São José dos Campos",
    state: "SP",
    price: 42000,
    description:
      "Exemplo de anúncio aprovado. No sistema final haverá validação automática (10+ anos), limites por CPF/CNPJ e aprovação manual.",
    status: "approved",
    createdAt: isoDaysAgo(3, 11),
    featured: false,
    images: [
      "/placeholders/car.svg",
      "/placeholders/car.svg",
      "/placeholders/car.svg"
    ]
  },
  {
    id: "l3",
    slug: "ford-maverick-1976-v8",
    title: "Ford Maverick 1976 V8",
    year: 1976,
    make: "Ford",
    model: "Maverick",
    city: "Curitiba",
    state: "PR",
    price: 125000,
    description:
      "Exemplo de anúncio com destaque pago (Mercado Pago no sistema final).",
    status: "approved",
    createdAt: isoDaysAgo(40, 10),
    featured: true,
    featuredUntil: isoDaysFromNow(14, 10),
    images: [
      "/placeholders/car.svg",
      "/placeholders/car.svg",
      "/placeholders/car.svg",
      "/placeholders/car.svg",
      "/placeholders/car.svg"
    ]
  },
  {
    id: "l4",
    slug: "anuncio-pendente",
    title: "Anúncio (pendente) – exemplo",
    year: 1989,
    make: "Fiat",
    model: "Uno",
    city: "Porto Alegre",
    state: "RS",
    price: 19000,
    description:
      "Exemplo de anúncio aguardando aprovação. Não deve gerar URL pública no portal.",
    status: "pending",
    createdAt: isoDaysAgo(1, 12),
    featured: false,
    images: ["/placeholders/car.svg"]
  }
];

export const news: NewsArticle[] = [
  {
    id: "n1",
    slug: "como-avaliar-carro-antigo-para-comprar",
    title: "Como avaliar um carro antigo antes de comprar",
    excerpt:
      "Checklist prático para evitar surpresas: documentação, histórico, funilaria, mecânica e originalidade.",
    content:
      "Avaliar um carro antigo vai muito além da aparência. Comece pela documentação e histórico, verifique sinais de funilaria e corrosão, e faça uma inspeção mecânica completa. Também é importante considerar a disponibilidade de peças e a originalidade do conjunto.\n\nNo Auto Garage Show, anúncios passam por aprovação manual e no sistema final haverá controles contra fraude e validação de e-mail.",
    category: "Guia",
    coverImage: "/placeholders/news.svg",
    publishedAt: isoDaysAgo(3, 9)
  },
  {
    id: "n2",
    slug: "tendencias-em-encontros-de-classicos-2026",
    title: "Tendências em encontros de clássicos para 2026",
    excerpt:
      "Crescimento de eventos regionais, curadoria mais rígida e foco em experiência (família, gastronomia e segurança).",
    content:
      "Os encontros de carros antigos estão cada vez mais organizados, com curadoria, regras claras e melhorias de infraestrutura. A tendência é equilibrar a paixão pelos clássicos com uma experiência completa para visitantes e expositores.\n\nA seção de calendário do Auto Garage Show foca em credibilidade: eventos precisam ser aprovados antes de gerar URL pública.",
    category: "Eventos",
    coverImage: "/placeholders/news.svg",
    publishedAt: isoDaysAgo(9, 9)
  },
  {
    id: "n3",
    slug: "como-funciona-o-destaque-de-anuncios",
    title: "Como funciona o destaque de anúncios",
    excerpt:
      "Entenda o destaque pago, expiração automática e como isso ajuda a manter o portal sustentável.",
    content:
      "O destaque é uma forma de dar mais visibilidade ao seu anúncio. No sistema final, a ativação será automática após pagamento via Mercado Pago e terá expiração automática.\n\nEste protótipo mostra apenas a experiência visual.",
    category: "Classificados",
    coverImage: "/placeholders/news.svg",
    publishedAt: isoDaysAgo(15, 9)
  }
];
