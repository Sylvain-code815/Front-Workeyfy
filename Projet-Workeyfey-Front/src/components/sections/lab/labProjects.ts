export type LabStatus = 'STABLE' | 'BETA' | 'OFFLINE';

export type LabProject = {
    id: string;
    name: string;
    domain: string;
    status: LabStatus;
    repo: string;
    stack: string[];
    loc: number;
    description: string;
    tagline: string;
    /** color used for accents inside the card (cyan default) */
    accent?: 'cyan' | 'magenta';
};

export const labProjects: LabProject[] = [
    {
        id: 'PRJ-001',
        name: 'QUANTUM CRM',
        domain: 'mahoudeau.dev',
        status: 'STABLE',
        repo: 'gh:workeyfy/quantum-crm',
        stack: ['React', 'Redux', 'PostgreSQL', 'Node'],
        loc: 48210,
        tagline: 'Customer relationship platform with realtime analytics.',
        description:
            'Comprehensive CRM with automated workflows, analytics dashboards and pluggable integrations.',
        accent: 'cyan',
    },
    {
        id: 'PRJ-002',
        name: 'PORTFOLIO BLOIS',
        domain: 'sylvain-code815.github.io',
        status: 'STABLE',
        repo: 'gh:sylvain-code815/portfolio',
        stack: ['HTML5', 'CSS3', 'JS', 'Three.js'],
        loc: 12044,
        tagline: 'Interactive front-end portfolio.',
        description:
            'Showcase of modern interactive web experiences. Built with hand-crafted animations and WebGL touches.',
        accent: 'cyan',
    },
    {
        id: 'PRJ-003',
        name: 'NEON FINTECH',
        domain: 'neon-fintech.io',
        status: 'BETA',
        repo: 'gh:workeyfy/neon-fintech',
        stack: ['Next.js', 'Rust', 'Postgres', 'Kafka'],
        loc: 91038,
        tagline: 'Realtime banking with neon-grid dashboards.',
        description:
            'Event-sourced ledger powering a banking interface with biometric auth and live transaction streams.',
        accent: 'magenta',
    },
    {
        id: 'PRJ-004',
        name: 'PULSE ANALYTICS',
        domain: 'pulse-analytics.app',
        status: 'STABLE',
        repo: 'gh:workeyfy/pulse-analytics',
        stack: ['Vue', 'ClickHouse', 'Go'],
        loc: 67220,
        tagline: 'Subsecond metrics and anomaly detection.',
        description:
            'Realtime metrics platform with a query builder for a columnar warehouse and an anomaly engine.',
        accent: 'cyan',
    },
    {
        id: 'PRJ-005',
        name: 'ORBIT SAAS',
        domain: 'orbit-saas.dev',
        status: 'BETA',
        repo: 'gh:workeyfy/orbit-saas',
        stack: ['Remix', 'Postgres', 'Stripe'],
        loc: 38500,
        tagline: 'Workspaces and billing for indie SaaS teams.',
        description:
            'Multi-tenant SaaS suite with usage-based pricing, plug-in marketplace and federated SSO.',
        accent: 'cyan',
    },
    {
        id: 'PRJ-006',
        name: 'LUMEN AI',
        domain: 'lumen-ai.studio',
        status: 'BETA',
        repo: 'gh:workeyfy/lumen-ai',
        stack: ['Python', 'FastAPI', 'Pinecone'],
        loc: 22987,
        tagline: 'Prompt studio with versioned evals.',
        description:
            'Versioned prompts and a deployment graph that ships variants behind feature gates.',
        accent: 'magenta',
    },
    {
        id: 'PRJ-007',
        name: 'ARCADIA GAMES',
        domain: 'arcadia-games.gg',
        status: 'STABLE',
        repo: 'gh:workeyfy/arcadia-games',
        stack: ['Unity', 'Go', 'WebRTC'],
        loc: 152340,
        tagline: 'Esports with deterministic match server.',
        description:
            'Tournament brackets, spectator overlays and a rewards economy on a deterministic match server.',
        accent: 'cyan',
    },
    {
        id: 'PRJ-008',
        name: 'NIMBUS DEVOPS',
        domain: 'nimbus-devops.sh',
        status: 'OFFLINE',
        repo: 'gh:workeyfy/nimbus-devops',
        stack: ['Kubernetes', 'TS', 'Rust'],
        loc: 41200,
        tagline: 'CI/CD console with SLO-driven gates.',
        description:
            'Build graphs, ephemeral preview environments and a deploy gate that respects service level objectives.',
        accent: 'magenta',
    },
];
