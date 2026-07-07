# QM-Pilot — Arbeitsregeln für Entwicklungs-Agenten

Verbindlicher Master-Plan: [`00_PLAN.md`](./00_PLAN.md). Spezifikationsquellen unter [`spec/`](./spec/) — Rangfolge siehe 00_PLAN.md §2.

**Prototyp-Regeln:** [`spec/prototype/CLAUDE.md`](./spec/prototype/CLAUDE.md) (Lock-Liste + UX-Muster gelten weiter).

## Arbeitsregeln (aus 00_PLAN.md §12/§13)

1. **Identifier englisch (camelCase), UI deutsch (Sie-Form).** Keine deutschen Feldnamen im Schema.
2. **Prototyp v2 ist die Spec:** vor jedem UI-WP den betreffenden Screen im Prototyp ansehen (`spec/prototype/…`). Gelockte Module nicht „verbessern".
3. **Jede fachliche Mutation:** Audit-Event in derselben Transaktion + Permission-Check über `permissions.ts` — nie nur UI-seitig.
4. **Kein physisches Löschen von Fachdaten.** Statusfelder statt DELETE.
5. **Framework-Doku im Repo lesen** (`node_modules/astro`, `node_modules/better-auth`, ZenStack-Docs) — nicht raten.
6. **Jedes WP:** Tests + Traceability-Eintrag in `validation/traceability.csv`, CI grün — sonst nicht „done".
7. **Migrationsdateien niemals nachträglich editieren;** neue Migration anlegen.

## Release-Regel (URS-F-052 / Risiko R-029)

Ein Software-Release ist **ausschließlich ein Git-Tag** auf einem Commit, dessen CI vollständig grün ist (lint, test, build, e2e). Kein manuelles Deployment ohne grüne Pipeline. CHANGELOG-Einträge nennen die berührten URS-IDs.

Software-Releases sind **getrennt** vom QM-Change-Control des Kunden (URS-F-053): Produkt-Versionierung läuft über dieses Repo, nicht über die Dokumentenlenkung des Mandanten.

## Test- und Traceability-Pflicht

Jedes Work-Package liefert:
- Vitest-Unit-/Integrationstests für neue Logik
- Playwright-E2E für Kern-Flows (wo anwendbar)
- Eintrag in `validation/traceability.csv` (URS-ID ↔ Implementierung ↔ Test)
- Bei Modulen ohne URS: URS-Nachtrag unter `validation/urs-addenda/`

## spec/-Rangfolge (00_PLAN.md §2)

Bei Widerspruch gilt die höhere Quelle:

1. `spec/prototype/QM-Pilot Prototyp v2.dc.html`
2. `spec/Berechtigungsmatrix_QM-Pilot_v0.2.xlsx`
3. URS/FS-DS/Risikoanalysen (`spec/urs/`)
4. `spec/extracted/gdp-katalog.json`
5. Modul-Specs (`spec/Prozess-Landkarte_…`, `spec/Reinigungsmodul_Spec_…`)
6. Seed-Daten (`spec/seed/`)
