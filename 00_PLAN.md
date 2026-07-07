# QM-Pilot — Master-Implementierungsplan

**Stand:** 2026-07-07 · **Status:** verbindlich nach Freigabe · **Zielrepo:** neues GitHub-Repo `qm-pilot`

---

## 1. Produktdefinition

QM-Pilot ist ein **mandantenfähiges elektronisches QM-System (eQMS) für GDP-regulierte Betriebe** (pharmazeutischer Großhandel nach § 52a AMG, § 73(3)-Importeure). Erster Kunde und Referenzmandant: **Pharmazeutika 73.3 GmbH** (6 Mitarbeitende, Aufsicht RP Stuttgart/ZLG). Endziel des Erstkunden: Ablösung von eqms.de nach ≥ 4 Wochen Schattenbetrieb.

QM-Pilot ist ein **eigenständiges Software-Produkt, kein Bestandteil des QMS des Kunden**. Software-Versionierung und Release-Freigabe laufen über Produkt-Governance (dieses Repo), nicht über die QM-Dokumentenlenkung des Kunden.

**Out of Scope:** inhaltliche Pflege der QM-Dokumente, ERP/Warenwirtschaft (SAP B1), Online-Shop, Patientendaten, FMD/securPharm-Scan (bleibt COBI.WMS), Temperatur-Primärerfassung (bleibt Testo Saveris — nur Datei-Import/Anzeige).

## 2. Maßgebliche Quellen (Rangfolge)

Alle Quellen werden nach WP-00 im Zielrepo unter `spec/` versioniert. Bei Widerspruch gilt die höhere Quelle:

1. **`spec/prototype/QM-Pilot Prototyp v2.dc.html`** — abgenommener Hi-Fi-Klickdummy, **maßgebliche funktionale + visuelle Spezifikation**. Per Prototyp-CLAUDE.md „gelockte" Module dürfen inhaltlich nicht abweichend gebaut werden.
2. **`spec/Berechtigungsmatrix_QM-Pilot_v0.2.xlsx`** — abgenommen 06.07.2026, verbindliches Rollen-/Rechte-Modell.
3. **URS/FS-DS/Risikoanalysen Stufe 0–2** (`spec/urs/`) — Detail-Anforderungen mit IDs (URS-F-001…068, URS-A-001…045, URS-D-001…045). Test- und Traceability-Anker.
4. **`spec/extracted/gdp-katalog.json`** — 320 GDP-Anforderungen, Prüfmaßstab für Abdeckung (inkl. `spec/extracted/feasibility-320.md`).
5. **`spec/Prozess-Landkarte_QM-Pilot_v0.1.md`**, **`spec/Reinigungsmodul_Spec_v0.1.md`** — Modul-Detailspecs über die URS hinaus.
6. Seed-Daten: **`spec/seed/qm-docs.js`** (171 Dokumente), **`spec/seed/routineplan_seed.json`** (191 Routineaufgaben), `spec/extracted/sop-catalog.json`, `docs-full.json`, `trans-*.json`.

**Kopier-Manifest** (WP-00, aus diesem Workspace):
`prototyp/2026-07-06_Hi-fi wireframes exploration/{QM-Pilot Prototyp v2.dc.html, support.js, qm-docs.js, CLAUDE.md, Änderungshistorie.md, extracted/*, uploads/routineplan_seed.json, assets/logo.png}` → `spec/prototype|seed|extracted/` und `prototyp/GDP-Pilot/{Berechtigungsmatrix_v0.2, alle URS/FS-DS/RA in neuester Version, Technische-Grundsatzentscheidungen_v0.2, Prozess-Landkarte, Reinigungsmodul_Spec, GDP-Anforderungskatalog_v0.2, Abdeckungsbericht_final_v1.0, Vision v0.2}` → `spec/urs/` bzw. `spec/`.

## 3. Getroffene Grundsatzentscheidungen (07.07.2026)

| # | Thema | Entscheidung |
|---|---|---|
| E1 | Stack | **Astro (SSR, Node-Adapter) + React-Islands**, PostgreSQL über **Prisma + ZenStack** (Access Policies), Tailwind CSS v4. Die Django-Entscheidung aus `Technische-Grundsatzentscheidungen_v0.2` ist damit **revidiert**. |
| E2 | Beziehung zu Apothekenpilot | **Neue eigenständige App, eigenes GitHub-Repo.** Kein geteilter Code; bewährte Patterns (ZenStack-Tenant-Policies, PIN-Kiosk) werden nachgebaut, nicht importiert. |
| E3 | Scope | **Voller Prototyp-v2-Umfang** in Phasen (nicht nur URS-Stufen 0–2). |
| E4 | Mandanten | **Multi-Tenant ab Tag 1** (`tenantId` auf allen Fachdaten, ZenStack-Isolation). Pharmazeutika 73.3 = erster Mandant. |
| E5 | Auth | **Better Auth**: E-Mail/Passwort + TOTP-2FA als Basis; **Entra-ID/OIDC als optionaler SSO-Provider pro Mandant**; PIN-Kiosk für Externe; befristete Auditor-Lesekonten. |
| E6 | Hosting | **Hetzner Cloud DE, selbst gehostet** (Docker Compose, TLS via Caddy/Traefik), georedundante Backups auf Hetzner Storage Box, getrennte Prod-/Test-Umgebung. GitHub bleibt Code-Host (statt Forgejo); CI/CD via GitHub Actions. |
| E7 | Validierung | **GAMP-5-Artefakte voll integriert**: jede Phase liefert Code + Tests + Traceability; für Module ohne URS (Stufe 3–7-Funktionalität) werden URS-Nachträge als Teil der Phase erstellt. |
| E8 | Übergabeformat | Dieses Plandokument + fertige Agent-Prompts (`prompts/WP-*.md`). |

## 4. Architektur

### 4.1 Laufzeit-Topologie (pro Umgebung, Prod und Test getrennt)

```
Hetzner Cloud VM (DE, z.B. CX32)
├── caddy            TLS-Terminierung, HSTS, Security-Header
├── app              Astro SSR (Node), horizontale Skalierung möglich
├── worker           gleicher Code, Einstieg worker.ts: Scheduler-Läufe, OCR, E-Mail, PDF
├── postgres         PostgreSQL 17 (deu-Volltext, Trigger-Härtung)
├── pgbackrest       WAL-Archivierung + tägl. Voll-Backup → Hetzner Storage Box (anderer Standort, verschlüsselt)
└── uptime/health    Heartbeat-Check (Scheduler, Backup) → Alarm-E-Mail
```

- **RPO ≪ 24 h** (WAL-Archivierung), **RTO ≤ 1 Arbeitstag** (dokumentiertes Restore-Runbook, jährliche Restore-Übung protokolliert).
- Backup-Staffelung: 30 Tage täglich, 3 Monate wöchentlich. Backup-Monitoring mit Fehlalarm (URS-F-035…043).
- Zeit: chrony/NTP auf dem Host; DB-Zeitstempel ausschließlich `timestamptz` UTC, Anzeige Europe/Berlin.
- Dateien (PDFs, Fotos, Nachweise): **Hetzner Object Storage (S3-kompatibel, DE)**, Zugriff ausschließlich über berechtigungsgeprüfte App-Endpoints (keine offenen URLs, URS-D). Verschlüsselung at rest.
- Getrennte Test-Umgebung: eigener Host oder eigener Compose-Stack auf separater VM, anonymisierte Daten.

### 4.2 App-Architektur

- **Astro 5, `output: 'server'`, Node-Adapter.** Seiten = Astro-Routen (SSR, Auth-Guard in Middleware); interaktive Module = **React-19-Islands** (`client:load`) pro Screen.
- **Datenzugriff:** ZenStack-enhanced Prisma Client serverseitig (Astro-Endpoints + Actions). Für Islands: ZenStack-REST-Handler (`@zenstackhq/server` API-Handler) unter `/api/model/[...path]` + generierte **TanStack-Query-Hooks** (`@zenstackhq/tanstack-query`). Mutationen mit Compliance-Semantik (Quittieren, Freigeben, Signieren) laufen **nicht** über generisches CRUD, sondern über dedizierte, auditierte Service-Endpoints.
- **Rechte-Durchsetzung dreischichtig:** (1) ZenStack-Policies = Tenant-Isolation + Basis-CRUD-Rechte, (2) zentraler `permissions.ts`-Service = Modulsichtbarkeit × Eingaberechte exakt nach Berechtigungsmatrix v0.2, (3) UI blendet nur aus, verlässt sich nie auf (3).
- **Scheduler:** `worker.ts`, minütlicher Tick, **idempotent** (Fälligkeiten erzeugen, Überfälligkeit, Eskalation, Vertretungsübergang, Ablauf-Frühwarnungen, Turnus-Schulungen), mit Aufhol-Logik nach Ausfall und Heartbeat-Tabelle (`SchedulerRun`) + Alarm (URS-A, RA-Stufe-1 „hohe Risiken").
- **E-Mail:** nodemailer, SMTP pro Umgebung konfigurierbar (DE-Relay), Fallback: In-App-Hinweis wenn kein SMTP (URS-A).
- **PDF-Erzeugung** (Berichte, Exporte, QR-Aushänge): serverseitiges Rendern der Druckansichten via Playwright-Chromium im worker.
- **OCR/Volltext:** tesseract (deu) im worker für Bild-PDFs; extrahierter Text → `tsvector('german')`, GIN-Index; Treffer rollenbeschränkt (URS-D).

### 4.3 Mandanten-Modell

`Tenant` (Betrieb) → `User`, alle Fachdaten tragen `tenantId`. Kein Branch-Level (GDP-Betriebe = eine Betriebsstätte; Erweiterung später möglich). ZenStack: `@@allow`-Regeln prüfen `auth().tenantId == tenantId` auf jedem Model; plattformweite Objekte (z. B. `PlatformAdmin`) getrennt. Mandanten-Konfiguration (`TenantConfig`): Feiertagskalender/Bundesland (Default BW), Arbeitstage (Default Mo–Fr), Eskalationsschwellen (Default 2 Tage → RP, 10 Tage → GL), Motivations-/Urlaubstexte, Session-Timeout, Aufbewahrungsjahre (Default 5), Branding/Firmenstammdaten inkl. Druck-Footer, SSO-Einstellungen, Fracht-Freigabe-Regel (RP & QMB / nur RP / nur QMB), Kapitel-10-Broker „nicht zutreffend"-Schalter.

## 5. Compliance-Fundament (nicht verhandelbar, in jedem WP mitzudenken)

1. **Audit-Trail** (URS-F-019–027): Tabelle `AuditEvent` — append-only, **DB-seitig erzwungen**: eigener Postgres-Nutzer für die App **ohne** UPDATE/DELETE auf `AuditEvent` + `BEFORE UPDATE/DELETE`-Trigger, der abbricht (gilt auch für Admin-Rollen der App). Inhalt: wer (userId + Klarname-Snapshot), was (Aktion, Objekt-Typ/-Id), wann (UTC), alt→neu (Diff-JSON), Kontext (tenantId, IP, Gerät). Jede fachliche Mutation schreibt in derselben DB-Transaktion einen Event. Durchsuchbar/filterbar, PDF/CSV-Export. Aufbewahrung ≥ Datensatz (5 Jahre).
2. **Unveränderbarkeit + Löschsperre** (URS-F-028–034): Freigegebene Versionen, Erledigungen, Lesebestätigungen, Signaturen sind **immutable** (Trigger-geschützt). Korrektur nur als neue Version. `retentionUntil` auf archivierungspflichtigen Objekten; Trigger blockiert Löschung vor Fristablauf. Kein physisches Löschen von Fachdaten — nur Deaktivieren.
3. **E-Signatur (Annex 11 sinngemäß):** Signieren = bewusster, erneut bestätigter Schritt (Passwort-Re-Auth bzw. PIN), erzeugt `Signature`-Datensatz (wer, wann, Bedeutung: erstellt/geprüft/freigegeben/quittiert), immutable.
4. **Funktionstrennung serverseitig:** Ersteller ≠ Prüfer ≠ Freigeber (Dokumente 3-stufig); Vier-Augen bei Nachweisart, Reinigungsplan, Mapping, Schulungsfreigabe; Selbstinspektions-Unabhängigkeitsregel bei Personalunion (RP+QMB/RP+GL → unabhängige Instanz prüft eigenen Bereich); Bestellung/Entzug der RP-Rolle nur durch GL. Rechte summieren sich bei Mehrfachrollen, Handlungen bleiben personenzugeordnet. Keine Sammelkonten. Deaktivieren statt Löschen; Austritt entzieht Zugang sofort.
5. **ALCOA+ für Externe:** PIN-Kiosk-Quittierung ist einer Person zugeordnet (Kachel + persönliche PIN), Fehlversuch-Sperre (5 Versuche), Throttling, nur registrierte Geräte.
6. **Validierung:** je Modul URS ↔ FS-DS ↔ Risiko ↔ Test nachverfolgbar (`validation/traceability.csv` im Repo, pro WP gepflegt). „Hohe Risiken" aus den Risikoanalysen sind **Pflicht-Tests**. IQ/OQ/PQ-Protokolle werden von Menschen ausgeführt/unterschrieben — die WPs liefern die ausführbaren Protokoll-Entwürfe.
7. **Software-Releases:** Git-Tags = „gelockte" Versionen, Release nur über CI (Build + alle Tests grün), CHANGELOG mit URS-Bezug, getrennt vom QM-Change-Control des Kunden (URS-F-044–053).

## 6. Datenmodell (Zielbild, englische Identifier, deutsche UI)

Gruppiert; Details in den WP-Prompts. Alle Fachmodelle: `tenantId`, `createdAt/By`, Audit-Pflicht.

- **Core:** `Tenant`, `TenantConfig`, `User` (roles[], `pinHash`, `pinFailedAttempts`, `pinLockedUntil`, m365-Subject, aktiv/ausgeschieden, Avatar/Initialen), `Role`/`RoleRight` (13 Module × 9 Eingaberechte, editierbar), `UserQualificationProof`, `KioskDevice` (registrierte Geräte), `AuditorInvite` (Zeitfenster, Sichtauswahl), `AuditEvent`, `Signature`, `SchedulerRun`, `Holiday`.
- **Aufgaben:** `TaskDefinition` (Titel, Quelldokumente n:m, Frequenz + Zeitplanung, Nachweisarten-Konfig, Zuständige/Gruppe, Claim-Logik, Freigabe-Status bei SOP-Bezug), `TaskOccurrence` (datiertes Vorkommen, effektiv Zuständige nach Vertretung, Status), `TaskCompletion` (immutable, Kommentar), `Evidence` (10 Subtypen: checklist, file, signature, photo, freetext, loggerCsv, measurement{value, min, max}, pdf, fourEyes{secondUserId}, counter), `PanPanAlert` (Quelle: überfällig/Messwert/CAPA-kritisch; RP-Quittierung mit Pflichtkommentar, CAPA-Link), `EscalationRule`, `Absence` (+ Vertretung, Genehmigung, Aufgaben-Umleitung).
- **Dokumente & Schulung:** `Document` (Nr, Art konfigurierbar: Handbuch/SOP/Vordruck/Anlage/Gesetzestext, Kapitel, Status inkl. „geplant"-Stub), `DocumentVersion` (Datei, Volltext, Status-Workflow erstellt→geprüft→freigegeben, Pflicht-Änderungsvermerk, gültig ab/außer Kraft), `DocumentReference` (erkannte Verweise SOP-XX-NNN/F-/A-/R-, beidseitig), `ReadingAssignment` (Rolle/Person, Turnus global + Override), `ReadingConfirmation` (versionsbezogen, append-only, Weg: reader/briefing/training), `Training` (Typ: sop/text/link/file/video, Turnus, Zuweisung, Vier-Augen-Freigabe), `ExternalTraining` (Zertifikat, QMB-Quittierung), `Briefing` (+ `BriefingReadConfirmation`), `ChatMessage`, `DocumentStoreItem` (gescannte Nachweise mit SOP/Vordruck-Zuordnung), `FlightRule` (Gesetzestexte: Link/Datei, Freigabe mit Ansehen-Pflicht, `validUntil`, Begriffe).
- **Betrieb:** `Supplier` / `ServiceProvider` (Stammdaten inkl. Bank, Status q/r/e/g, `approvedUntil`, `nextAudit`, `QualificationFile` mit Dokumenten + Abläufen + Archiv, QS-Vereinbarung/AVV), `InventoryItem` (Raum/Gerät/Software, Prüf-/Kalibrierstatus → Auto-Aufgabe), `TemperatureMapping` (Skizze, Messpunkte, Logger, min/max/Ø, Vier-Augen), `FreightCase` (Logger-Upload je Wareneingang, Freigabe nach Tenant-Regel), `TemperatureEvent`/Exkursion (→ Pan Pan/CAPA), `CleaningTask` (Was/Wo/Wer/Womit/Wie/Wann, Kritikalität, PSA, Vier-Augen-Plan-Freigabe, `qrToken`, Ausführungs-Log mit via QR/PIN + Gerät, Sichtkontrolle).
- **Qualität:** `Capa` (Klasse kritisch/major/minor, Prozess erfasst→Ursache→Maßnahmen[]→Wirksamkeitsprüfung→Abschluss nur GL/RP/QMB/Stellv.; erfassen dürfen auch Lager-/Servicecrew; Info Kunde/Behörde), `ChangeControl` (Antrag→Bewertung→Genehmigung→Umsetzung→Abschluss, CAPA-Verknüpfung beidseitig), `Kpi`/`CustomKpi`, `Report` (Management-Review, GDP-KPI, Internes Audit mit Checkliste i.O./n.z./n.i.O. → CAPA; RP-Unterschrift), `AuditChecklistItem`.

## 7. Design-System (gelockt — 1:1 aus Prototyp v2 übernehmen)

- **Schrift:** ausschließlich **'Hanken Grotesk'** (400–800, self-hosted — kein Google-CDN wegen DSGVO), Zahlen `tabular-nums`.
- **Farben:** Primär Türkisgrün `#38B098`, Aktions-Dunkelgrün `#0f6e56` (Hover `#0c5b47`), Warmrot `#E03010`/Text `#c62a0d`, Gelb `#FFC02E`/Text `#8a5a06`, Lila `#7C4DFF`, Hintergrund `#eef1f0`, Flächen `#fff`, Rahmen `#e6ebe9`/Inputs `#dce4e0`, Text `#16241f`, Muted `#8a978f`. Badges: ok `#e1f5ee`, bad `#fbe4de`, warn `#fff2d4`, info `#eee7ff`.
- **Layout:** weiße Sidebar 236 px (Gruppenlabels 10 px uppercase, aktiver Punkt-Indikator mit Glow, Pan-Pan-Item rot mit Zähler, Benutzerkarte unten) · Topbar (Breadcrumb 11 px uppercase, H1 21 px/700, Uhr, **Flugstatus-Chip**, globale Suche) · Content `padding: 20px 26px 30px`.
- **Komponenten:** Cards `radius:14px`, Zeilen-Cards mit Status-Punkt, KPI-Kacheln (4er-Grid, 34-px-Zahl, farbiger 4-px-Bodenbalken, Hover-Lift) als klickbare Filter, Buttons 38 px/9 px-Radius (solid/`tl`/`ghost`), Filter-Pills, Hero-Karte mit Türkis-Gradient, Donuts nur im Schulungsstand.
- **Regeln:** Freitext nie `<input>`, immer wachsende Textarea; überall `overflow-wrap:anywhere`/`min-width:0`; alle Inputs einheitlich (heller Rahmen, grüner Fokus); Datumsmaske TT.MM.JJJJ + Schnell-Pills 1/2/3 Jahre.
- **Sprache/Metapher:** UI deutsch, Sie-Form. Flieger-Metapher: Cockpit, Briefing, Crew, **Pan Pan**, Flight Rules, Flugstatus („Kurs stabil" / „Leichte Turbulenzen" ab >5 heute fällig / „Achtung Druckverlust" ab ≥1 überfällig — Chip klickbar → gefilterte Ansicht).

## 8. Übergreifende UX-Muster (aus Prototyp-CLAUDE.md, gelten für ALLE Module)

1. **Einheitlicher Freigabeprozess:** Eintrag → Detailansicht; Freigabe erst nach Ansehen-Pflicht; Ablauftermin (Maske + Pills); Vier-Augen (Ersteller ≠ Freigeber); sichtbar für alle erst nach Freigabe; Ablauf-Frühwarnung (1 Monat) an RP/QMB; Zurückweisen mit Pflichtkommentar → rote Cockpit-Karte beim Ersteller → Wiedereinreichung.
2. **Audit-Trail-Grundsatz:** jede Aktion schreibt sofort einen unveränderlichen Event.
3. **Muster verallgemeinern:** einmal festgelegtes Verhalten (Sortierköpfe, KPI-Filter-Kacheln, klickbare Zeilen → Detail, Live-Suche) gilt für alle vergleichbaren Listen.
4. **Motivierendes Feedback**, keine bloßstellenden Vergleiche; Leerzustände positiv („Reiseflughöhe", „all doors in flight").
5. **Arbeitsreihenfolge:** erst Komplett-Ansicht (GL/RP/QMB/Stellv.), dann Rollen-Ableitungen (Operativ / Extern-PIN / Auditor / Admin).

## 9. Phasenplan & Work-Packages

Abhängigkeiten: WPs einer Phase bauen auf der Vorphase auf; innerhalb einer Phase sind WPs weitgehend parallelisierbar (Ausnahmen vermerkt in den Prompts). Jedes WP = 1 Paperclip-Task = 1 Agent-Auftrag (`prompts/WP-XX_*.md`).

### Phase 0 — Fundament (URS-Stufe 0)
| WP | Inhalt |
|---|---|
| WP-00 | Repo-Bootstrap: Astro+React+Tailwind+Prisma+ZenStack+Vitest+Playwright, CI, `spec/`-Übernahme, Projektregeln (CLAUDE.md) |
| WP-01 | Datenmodell-Fundament: Tenant/User/Rollen/Rechte-Matrix/Config, ZenStack-Policies, Seeds |
| WP-02 | Audit-Trail & Immutability: `AuditEvent` append-only (Trigger + DB-Rollen), Löschsperre, Signature-Service |
| WP-03 | Auth: Better Auth (E-Mail/Passwort + TOTP), Entra-OIDC pro Mandant, PIN-Kiosk + Geräteregistrierung, Auditor-Konten, Session-/Sperr-Regeln |
| WP-04 | Design-System & App-Shell: Tokens, Basiskomponenten, Sidebar/Topbar/Flugstatus, rollenbasierte Navigation, Persona-Gerüst |
| WP-05 | Hetzner-Deployment: Compose-Stack, TLS, pgBackRest→Storage Box, Prod/Test, Monitoring/Heartbeat, Restore-Runbook |

### Phase 1 — Aufgaben (URS-Stufe 1)
| WP | Inhalt |
|---|---|
| WP-10 | Scheduling-Engine: TaskDefinition/Occurrence, Frequenzen, Feiertags-/Arbeitstags-Logik (Vorziehen auf vorherigen Arbeitstag), idempotenter Worker mit Aufhol-Logik |
| WP-11 | Aufgaben-UIs: Meine Aufgaben / Alle Aufgaben (KPI-Kacheln, Filter, Sortierung, Gruppierung, Claim), Erledigt-Register |
| WP-12 | Erledigen-Modal + 10 Nachweisarten inkl. Messwert-Grenzverletzung → Pan Pan, Vier-Augen-Flow, Datei/Foto/Unterschrift |
| WP-13 | Pan-Pan-Register, Eskalations-Engine (E-Mail + In-App, 2 T → RP / 10 T → GL / Schulung → QMB), Abwesenheit & Vertretung mit Genehmigung |
| WP-14 | Aufgaben anlegen (Formular, Freigabe-Weiche bei SOP-Bezug) + Import der 191 Routineaufgaben |

### Phase 2 — Dokumente & Schulung (URS-Stufe 2)
| WP | Inhalt |
|---|---|
| WP-20 | Dokumente-Kern: Document/Version, Arten, 3-stufige Freigabe, Änderungsvermerk, berechtigungsgeprüfte Dateiauslieferung, Verweis-Erkennung |
| WP-21 | Reader & Suche: PDF/strukturierte Anzeige, Versionshistorie, OCR-Pipeline, Volltextsuche (GIN), SOP-Editor, Redline, Druckansicht |
| WP-22 | Lesebestätigung (3 Wege) + Schulungen + Schulungsstand/-register (Exports, Donuts, Erinnern) |
| WP-23 | Cockpit-Kommunikation: Briefing (Verweis-Pflichtöffnung = Lesebestätigung), Crew-Chat, Dokumentenspeicher, Flight Rules |
| WP-24 | Seed-Import: 171 Dokumente inkl. „geplant"-Stubs, Kapitel-10-Schalter |

### Phase 3 — Betrieb
| WP | Inhalt |
|---|---|
| WP-30 | Lieferanten & Dienstleister: Qualifizierungsakte, Freigabe-Workflow, Ablauf-Frühwarnung + Auto-Aufgaben, Archiv |
| WP-31 | Inventar & Temperaturmapping (Skizze, Messpunkte, Vier-Augen, Remapping, Kalibrier-Auto-Aufgaben) |
| WP-32 | Temperatur: Frachten-Freigabe, Exkursionen → Pan Pan/CAPA, Logger-CSV-Import |
| WP-33 | Reinigung: Plan mit Vier-Augen, QR-Aushänge (Druck), Kiosk-Quittierung (QR/PIN, 1×/h, Geräte-Verifizierung), Sichtkontrolle |

### Phase 4 — Qualität & Verwaltung
| WP | Inhalt |
|---|---|
| WP-40 | CAPA (Rollen-Trennung erfassen/abschließen, Pan-Pan-Kopplung) |
| WP-41 | Change Control (+ CAPA-Verknüpfung) |
| WP-42 | KPI-Dashboard + Berichte (Management-Review, GDP-KPI, Internes Audit → CAPA, RP-Unterschrift, Jahresexporte) |
| WP-43 | Verwaltung: Benutzer/Rechte-Matrix-UI, Auditor-Einladung, Audit-Trail-UI + Exporte, System & Backup, Einstellungen/Profil/Urlaub |

### Phase 5 — Cockpit, Rollen, Validierung, Go-Live
| WP | Inhalt |
|---|---|
| WP-50 | Cockpit-Vervollständigung: Lagebild, Großwetterlage, „Aufmerksamkeit erforderlich" (aggregiert alle Module) |
| WP-51 | Rollen-Ableitungen: Operativ (Jana/Paul), Extern-PIN-Kiosk, Auditor (lesend + Banner), Admin (ohne QM-Zugriff) — inkl. E2E-Tests je Rolle |
| WP-52 | Validierungspaket: URS-Nachträge Stufe 3–7, Traceability-Matrix-Abschluss, IQ/OQ/PQ-Protokoll-Entwürfe, Restore-Übung, Schattenbetriebs-Plan, 320er-Abdeckungsnachweis |

## 10. Validierungsstrategie (in jedem WP)

- Jedes WP endet mit: (a) Vitest-Unit-/Integrationstests, (b) Playwright-E2E für die Kern-Flows, (c) Eintrag in `validation/traceability.csv` (URS-ID ↔ Implementierung ↔ Test), (d) bei Modulen ohne URS: **URS-Nachtrag** als `validation/urs-addenda/URS-<Modul>.md` im selben Stil/Nummernschema wie Stufe 0–2.
- **Pflicht-Tests** = alle „hoch"-Risiken der Risikoanalysen (Stufe 0: 11, Stufe 1: 5, Stufe 2: 8 — Liste in den Prompts). Beispiele: Audit-Trail auch für Admins unveränderbar; genau eine gültige Dokumentversion; nachholende Fälligkeits-Erzeugung nach Worker-Ausfall; Zugang nach Austritt sofort entzogen; kein offener Dateizugriff.
- IQ/OQ/PQ: WP-52 liefert Protokoll-Entwürfe; Ausführung + Unterschrift durch unabhängige Person (Mensch) — nicht Teil der Agent-Arbeit.
- Abnahme-Referenz: 320er-GDP-Katalog; Restpunkte aus `Abdeckungsbericht_final_v1.0` (Backend-Erzwingung, Restore-Test, Notfallplan) sind in WP-02/WP-05/WP-52 fest eingeplant.

## 11. Offene Punkte mit gesetzten Defaults

Die Konzeptdokumente lassen Details offen; wir setzen Defaults (jeweils mandantenkonfigurierbar), Änderung jederzeit möglich:

| Punkt | Default |
|---|---|
| Eskalationsschwellen | 2 Tage → RP, ≥10 Tage → GL, Schulungen → QMB (fest aus Prototyp, konfigurierbar) |
| Session-Timeout / Kiosk-Auto-Sperre | 30 min / 60 s Inaktivität |
| PIN-Sperre | 5 Fehlversuche → 15 min Sperre, Throttling ab 3 |
| Zählweise „täglich" | 1 Fälligkeit pro Arbeitstag |
| Feiertagskalender | berechnet (BW) + manuell pflegbar |
| Dateitypen/-größen Nachweise | pdf/jpg/png/csv, 25 MB |
| QR-Sicherheit Reinigung | signierter Zufallstoken je Aufgabe, Quittierung nur von registrierten Geräten (gilt auch für QR-Weg), 2. Scan < 1 h → Hinweis ohne Doppel-Log |
| OCR-Sprache | deutsch (deu), erweiterbar |
| Scheduler-Frequenz | 1 min Tick, Fälligkeits-Erzeugung 90 Tage rollierend |
| E-Mail | SMTP konfigurierbar; ohne SMTP nur In-App |
| Webfont | Hanken Grotesk self-hosted |

## 12. In der Detailplanung aufgelöste Quellen-Konflikte (zur Bestätigung durch Produktverantwortlichen)

Beim Ausarbeiten der WP-Prompts wurden Widersprüche zwischen den Quellen gefunden. Die WPs setzen jeweils eine begründete Entscheidung; hier die Liste zur einmaligen Bestätigung (Änderung = Kommentar im jeweiligen WP genügt):

| # | Konflikt | Gesetzte Entscheidung | WP |
|---|---|---|---|
| K1 | URS-F-010/011 verlangt M365-SSO als Pflicht; Entscheidung E5 macht es optional | E5 gilt; formale URS-Abweichungsnotiz + URS-Anpassung in WP-52 | WP-03/52 |
| K2 | Berechtigungsmatrix v0.2 vs. Prototyp-`roleDefaults` (Lagercrew ohne Lieferanten/Dienstleister, Servicecrew ohne Inventar/Temperatur im Prototyp) | **Matrix verbindlich** (abgestimmt 06.07.) — obwohl der Prototyp formal ranghöher ist | WP-01/04 |
| K3 | Stellvertreter (Sara) bekommt im Prototyp die Operativ-Navigation, laut Matrix/Plan gehört Stellv. zur Komplett-Ansicht | Komplett-Navigation, Items rechtegetrieben ausgeblendet | WP-04/51 |
| K4 | Berichte unterzeichnen: Matrix = nur RP/Stellv. RP; Prototyp lässt auch GL signieren | Matrix verbindlich (GL signiert nicht) | WP-42 |
| K5 | Prototyp-System-Screen hat Schalter „Audit-Trail abschaltbar" — widerspricht §5 Nr. 1 | Kein Toggle; fest aktiv als Info-Zeile | WP-43 |
| K6 | Gelockte Prototyp-Texte in Du-Form vs. Sie-Form-Regel | Lock gewinnt: wörtlich übernommene Prototyp-Texte bleiben Du-Form, alles Neue Sie-Form | WP-50 |
| K7 | Seed-Frequenzen (`laufend`, `anlassbezogen`, `alle 2/3 Jahre`, `halbjährlich`) fehlen in URS-A | Generisches Unit/Interval-Modell; `laufend`/`anlassbezogen` als unterminierte, inaktive Definitionen importiert + Nachpflege-Report | WP-10/14 |
| K8 | Reinigungs-Freigabe: Prototyp zweistufig, Spec dreistufig (Ersteller≠Prüfer≠Freigeber) | Dreistufig (Spec gewinnt) | WP-33 |
| K9 | Aufbewahrungsfrist: Plan-Default 5 Jahre, Prototyp zeigt 10 | Default 5, Referenzmandanten-Seed 10 | WP-43 |
| K10 | KPI-Werte im Prototyp teils hartkodiert (Termintreue 95 %, Reaktionszeit 1,4 h) | Formeln neu definiert (30-Tage-/12-Monats-Fenster) — **fachlich gegenlesen** | WP-42 |
| K11 | PIN-Seed-User „Reinigung Lager" = faktisch Sammelkonto (verboten per URS-F-008) | Kiosk-Konten nur als natürliche Personen | WP-01 |
| K12 | Hanken Grotesk im Prototyp vom Google-CDN | Self-hosted, E2E-Check „keine Fremd-Origin-Requests" | WP-04 |
| K13 | Zählabweichung URS („70 Vordrucke, 40 Anlagen") vs. Seed (76/43 + 10 Gesetzestexte) | Seed (`qm-docs.js`, 171 Dokumente) maßgeblich | WP-24 |

## 13. Arbeitsregeln für Entwicklungs-Agenten

1. **Identifier englisch (camelCase), UI deutsch (Sie-Form).** Keine deutschen Feldnamen im Schema.
2. Prototyp v2 ist die Spec: vor jedem UI-WP den betreffenden Screen im Prototyp ansehen (`spec/prototype/…`, im Browser öffnen oder HTML lesen). Gelockte Module nicht „verbessern".
3. Jede fachliche Mutation: Audit-Event in derselben Transaktion + Permission-Check über `permissions.ts` — nie nur UI-seitig.
4. Kein physisches Löschen von Fachdaten. Statusfelder statt DELETE.
5. Astro-Docs im Repo lesen (`node_modules`), nicht raten — gleiche Regel wie im Apothekenpilot-Workspace.
6. Jedes WP: Tests + Traceability-Eintrag, sonst nicht „done". CI muss grün sein.
7. Migrationsdateien niemals nachträglich editieren; neue Migration.
