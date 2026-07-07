# QM-Pilot

QM-Pilot ist ein **mandantenfähiges elektronisches QM-System (eQMS) für GDP-regulierte Betriebe** — pharmazeutischer Großhandel nach § 52a AMG und § 73(3)-Importeure. Erster Kunde und Referenzmandant ist die Pharmazeutika 73.3 GmbH. Das System ersetzt nach Validierung und Schattenbetrieb die bisherige eqms.de-Lösung.

QM-Pilot ist ein **eigenständiges Software-Produkt**, kein Bestandteil des QMS des Kunden. Software-Versionierung und Release-Freigabe laufen über Produkt-Governance in diesem Repo, getrennt von der QM-Dokumentenlenkung des Mandanten.

## Voraussetzungen

- **Node.js** 22 LTS (`.nvmrc` optional)
- **Docker** für lokale PostgreSQL-Instanz
- **npm** 10+

## Setup

```bash
# Repository klonen
git clone https://github.com/konkissner/qm-pilot.git
cd qm-pilot

# Abhängigkeiten installieren
npm install

# Umgebungsvariablen
cp .env.example .env

# PostgreSQL starten
docker compose -f docker-compose.dev.yml up -d

# Schema generieren und migrieren
npm run db:generate
npm run db:migrate

# Entwicklungsserver
npm run dev
```

Die Startseite ist unter http://localhost:4321 erreichbar.

## Skripte

| Skript | Beschreibung |
|---|---|
| `npm run dev` | Astro-Entwicklungsserver |
| `npm run build` | ZenStack generate + Astro-Production-Build |
| `npm run start` | Production-Server (`dist/server/entry.mjs`) |
| `npm run lint` | ESLint + `astro check` |
| `npm test` | Vitest Unit-Tests |
| `npm run test:e2e` | Playwright E2E-Tests |
| `npm run worker` | Scheduler-Worker (Platzhalter) |
| `npm run db:generate` | `zenstack generate` → Prisma-Schema |
| `npm run db:migrate` | `prisma migrate dev` |

## Projektstruktur

```
src/
  pages/          # Astro SSR-Routen
  pages/api/      # API-Endpoints
  islands/        # React-19-Islands
  components/     # Basiskomponenten (WP-04)
  layouts/        # Astro-Layouts
  lib/            # Services (auth/, audit/, db, permissions)
  styles/         # Tailwind v4 global.css
  worker.ts       # Scheduler-Einstiegspunkt
prisma/           # Generiertes Schema + Migrationen
spec/             # Spezifikationsquellen (URS, Prototyp, Seeds)
validation/       # Traceability-Matrix, URS-Nachträge
e2e/              # Playwright-Tests
```

## Dokumentation

- **Master-Plan:** [`00_PLAN.md`](./00_PLAN.md) — Architektur, Phasenplan, Compliance-Regeln
- **Agent-Regeln:** [`CLAUDE.md`](./CLAUDE.md)
- **Spezifikationen:** [`spec/`](./spec/) — Prototyp, URS, Seeds
- **Changelog:** [`CHANGELOG.md`](./CHANGELOG.md)

## CI

Jeder Push und PR löst GitHub Actions aus: `lint`, `test`, `build`, `e2e`. Releases sind ausschließlich Git-Tags auf Commits mit grüner CI (URS-F-052).
