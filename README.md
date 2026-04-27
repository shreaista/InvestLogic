# InvestLogic Frontend

Enterprise-grade funding proposals, diligence workflows, and portfolio analytics—built with Next.js.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui pattern (custom components)
- **Icons**: Lucide React
- **Font**: Inter (Google Fonts)
- **Theming**: next-themes (dark/light mode)
- **Auth**: JWT sessions with jose

## UI Architecture

```
components/
├── ui/              # Base UI primitives (Button, Card, Input, Table, Badge)
├── layout/          # Layout components (AppShell, Topbar, SidebarNav, PageHeader)
└── providers/       # Context providers (ThemeProvider)

app/
├── (auth)/          # Auth pages (login) - centered minimal layout
├── (app)/           # App pages (dashboard/*) - sidebar + topbar layout
└── api/             # API routes (auth/login, auth/logout)
```

## Design System

- **Colors**: Slate/gray neutral palette with blue/indigo accent
- **Typography**: Inter font with strong hierarchy
- **Spacing**: Consistent 4px grid system
- **Dark Mode**: Full dark/light mode support via CSS variables

## Getting Started

```bash
npm install
npm run dev
```

## Environment Variables

```env
JWT_SECRET=your-secret-key-min-32-chars
```

## Demo Accounts

| Role         | Email             | Password    |
|--------------|-------------------|-------------|
| SaaS Admin   | admin@ipa.com     | Admin#123   |
| Tenant Admin | tenant@ipa.com    | Tenant#123  |
| Assessor     | assessor@ipa.com  | Assess#123  |

## Deployment

Deployed to Azure Container Apps via Docker:

```bash
.\deploy.ps1 -Msg "your commit message"
```
