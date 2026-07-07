# QM-Pilot — Prozess-Landkarte (Entwurf v0.1)

**Zweck:** Mein Verständnis deiner in den Klickdemos (Prototyp v2) gestalteten Abläufe — als Abstimmungsgrundlage, damit das spätere Backend exakt an deinem Design entlang gebaut wird. Bitte prüfen/korrigieren; danach dient sie als Basis für die FS/DS und die Umsetzung.

**Analysebasis:** `QM-Pilot Prototyp v2.dc.html`, `Sidebar.dc.html`, `CLAUDE.md` (gelockte Design-Entscheidungen).

---

## 0. Grundgerüst & Personas

**Personas:** lena (RP·QMB), michael (GL), jana (Lagercrew), paul (Servicecrew), ext (Externe/PIN-Kiosk), auditor (lesend), admin (technisch).

**Rollen-Ableitung:** Komplett-Ansicht = Lena (RP·QMB) und Michael (GL) identisch. Alle anderen Rollen sind Einschränkungen davon (Aufgabenset, Menü, Rechte). GL sieht Eskalationen erst ab 10 Tagen; RP·QMB sieht alles. Rechte serverseitig durchgesetzt. Startseite je Rolle: ext→Aufgaben, auditor→Audit, admin→Benutzer, sonst Cockpit.

**Flugstatus (berechnet, immer genau EIN Status, in der Topbar):** ≥1 überfällig → „ACHTUNG DRUCKVERLUST" (rot, Vorrang) · >5 heute fällig → „LEICHTE TURBULENZEN" (gelb) · sonst „KURS STABIL" (grün). Klick → überfällige Aufgaben.

---

## 1. Cockpit
Persönliches Lagebild + (GL/RP·QMB) Team-Überblick, Briefing-Kanal, Crew-Chat.

- **Willkommensfläche** mit klickbarem Flugstatus-Chip.
- **Lagebild** (eigene Zahlen): 4 klickbare KPI-Karten — Heute fällig, Offen gesamt, Überfällig, Schulungen (%).
- **Großwetterlage** (nur GL/RP·QMB): Team-Summen, Klick → Alle Aufgaben / Pan Pan / Schulungsstand.
- **„Aufmerksamkeit erforderlich"** (nur GL/RP·QMB): offene Freigaben (Aufgaben + Lieferanten), Ablaufwarnungen, überfällige Aufgaben/Pflichtlektüren. GL nur ≥10 Tage. Pill „Briefing durchgeführt" → „✓ {Datum/Uhr}" + Audit + Case-Counter (Berichte).
- **Briefing (Crewdurchsage):** GL/RP/QMB verfassen mit optionalem Verweis (Suchfeld „Handbuch durchsuchen"); Veröffentlichen → alle + Audit. Alle lesen; bei SOP-Verweis „Als gelesen bestätigen" erst nach Öffnen des Verweises. **SOP-Verweis öffnen+bestätigen = Lesebestätigung (zählt bei Schulungen).** Leerzustand „✈ all doors in flight"; Logbuch-Suche.
- **Crew-Chat:** Nachrichten mit Zeitstempel.

**Neue Entitäten:** Briefing (Autor, Zeit, Text, Verweis-Doc, Lesebestätigung je Person), Briefing-Case-Counter, Chat-Nachricht.

---

## 2. Aufgaben

**2.1 Meine Aufgaben (gelockt):** Filter-Pills (Alle offenen/Heute/Überfällig/Regelmäßig) mit Zählern; Gruppier-Pill (nach Quelldokument ↔ chronologisch); Eskalationskarte bei Überfällig; Erledigen → Nachweis-Modal (Training-Task → Dokument-Reader). Leermeldung „Reiseflughöhe".

**2.2 Alle Aufgaben (gelockt, GL/RP·QMB):** 4 KPI-Karten; Mitarbeiter-Auswahl (ab 10 MA nach Rollen gruppiert + Suche, sonst Pills); sortierbare Spalten; Zeile → selbst erledigen / bearbeiten.

**2.3 Aufgaben anlegen (gelockt):** Titel; Quelldokument(e) per Suche; Frequenz-Pills (einmalig/täglich/wöchentlich/monatlich/jährlich) mit passender Zeitplanung; Nachweis (10 Arten, Mehrauswahl); Zuständig (Mehrfach + „ganze Gruppe") → je Person eine Aufgabe. **Freigabe-Weiche:** Aufgaben mit SOP-Bezug erst nach Freigabe aktiv (Approver: bei RP-Anlage die Stellv. RP, sonst die RP).

**2.4 Freigabe-Workflow:** Freigabe erst nach Ansicht der Akte; editierbar; Freigeben → aktiv + Audit.

**2.5 Pan Pan:** zentrale Dringlichkeitsliste (überfällige Aufgaben + Pflichtlektüren); Auto-Eskalation (2 Tage → RP, ≥10 Tage → GL, Schulung → QMB); „Erinnern" / „Kommentieren & quittieren".

**2.6 Abwesenheiten/Vertretung:** eintragen (mit Vertretung) → Bestätigung (Erinnerung nach 48 h, sonst QMB) → wiederkehrende Aufgaben gehen am Startdatum über → Rückgabe + Protokoll. **Pflichtlektüren bleiben persönlich.**

**Neu:** Nachweis-Subtypen als Struktur; Freigabe-Workflow-Objekt; Eskalationsregel/-status; Vertretungs-Workflow (Reassignment).

---

## 3. Betrieb

**3.1 Lieferanten:** KPI-Klickfilter (qualifiziert/Re-Qualifizierung/Erstqualifizierung/gesperrt); Neuanlage (Stammdaten, mehrere Kontaktpersonen, Verantwortliche/QMB/Behörde je mit Mail+Tel, komplette Bankdaten, Unterlagen-Upload mit Gültigkeiten); **Freigabe-Workflow** (Einreichen → RP prüft → Freigabe nur mit „gültig bis" + „nächstes Audit", oder Rücksendung mit Pflichtkommentar); Stammdaten-Änderung durch Nicht-RP → RP-Quittierung; Qualifizierungsakte mit Kommentaren + Archiv; Ablauf-Frühwarnung (1 Monat vorher).

**3.2 Dienstleister:** Übersicht (Leistung, QS-Vereinbarung/AVV, Nachweis gültig bis, Status); ablaufende Nachweise → Auto-Aufgabe.

**3.3 Inventar:** Geräte/Räume mit Prüf-/Kalibrier-/Qualifizierungsstatus; fällige Prüfung → Auto-Aufgabe.

**3.4 Temperatur:** Zonen-Live-Werte + Soll-Bereiche + Logger; Exkursions-/Ereignisliste; Exkursion → sofort Pan Pan an RP, ggf. CAPA.

**Neu (komplett):** Lieferant + Qualifizierungsakte + Freigabe-Workflow; Dienstleister; Inventar/Equipment; Messstelle/Logger/Messwert-Serie + Exkursion.

---

## 4. Dokumente
Dokumentenlenkung + rollenbasierte Pflichtlektüre. Sidebar der Full-Ansicht nach Art: QM-Handbuch, SOP, Vordrucke, Anlagen, **Flight Rules (Gesetzestexte)**.

- Liste gruppiert nach Art mit Lesestatus-Badges (Externe nur zugewiesene).
- App-weite **Volltext-Suche inkl. OCR**, nach Art gruppiert.
- **Reader:** Metadaten, klickbare **Verweise-Liste**, Versionshistorie mit Änderungsvermerk; **Lesebestätigung** (Pflicht bei neuer Version) → Audit + Schulungsquote.

**Neu:** OCR-Volltextindex; Verweis-Relation Dokument↔Dokument; „Version in Kraft setzen" mit Pflicht-Änderungsvermerk (teils schon gebaut).

---

## 5. Qualität & Audit

**5.1 Schulungen (QMB):** globaler Standard-Turnus + Override je Dokument; Pflichtleser-Zuweisung (Rollen/Personen); protokolliert.

**5.2 Schulungsstand (QMB):** Team-Donut + pro-MA-Donuts (<80 % rot); „Wer fehlt noch?" mit „Erinnern"; Schulungsregister (append-only, exportierbar, 5 J.).

**5.3 CAPA:** KPI (läuft/Wirksamkeitsprüfung/abgeschlossen); Tabelle (Nr., Titel & Quelle, Verantwortlich, Fällig, Status). **Neue CAPA entsteht real aus Pan-Pan-Quittierung einer Messwert-Grenzverletzung.**

**5.4 KPI/Berichte:** Kennzahlen + Monatsverlauf; Case-Counter (Briefings, Eskalationen, erledigte Aufgaben); Regelberichte + Exporte (Schulungsregister, Audit-Trail als PDF, ALCOA+).

**5.5 Audit-Trail:** unveränderliches Protokoll (Zeit/Benutzer/Aktion/Objekt/Alt→Neu), jede Aktion live.

**5.6 Benutzer & Rollen:** Neuanlage (Name, E-Mail, Anmeldeart M365 **oder** PIN·Kiosk, kombinierbare Rollen); **Rechte-Matrix** (Funktion × 9 Rollen: Vollzugriff/nur ansehen/kein Zugriff), serverseitig durchgesetzt.

**Neu:** Turnus (global+Override); CAPA; KPI-Aggregation + Bericht/Export-Objekte; Rechte-Matrix; M365-SSO + PIN-Konten.

---

## 6. Sonderrollen
- **Externe (PIN-Kiosk):** nur Meine Aufgaben + zugewiesene Dokumente; Nachweis meist Foto.
- **Auditor:** lesend — Audit-Trail, Schulungsregister, Dokumente, Lieferanten, Inventar.
- **Admin:** nur Benutzer, Rechte-Matrix, System & Backup (M365, PIN, Auto-Sperrung, Backup/Aufbewahrung) — kein QM-Zugriff.

---

## Querschnittliche Muster

**Audit-Trail:** jede Aktion → unveränderlicher Eintrag mit Person + Zeitstempel.

**Nachweisarten (10, Mehrauswahl):** Checkliste · Datei · Digitale Unterschrift · Foto · Freitext · Logger-Import (CSV) · **Messwert (Einheit + Soll-Bereich; Verletzung → Pan Pan → RP quittiert → ggf. CAPA)** · PDF · **Vier-Augen-Prinzip (2. Person prüft Nachweise, erzeugt Folge-Task)** · Zähler/Menge.

**Flieger-Sprache:** Pan Pan = überfällig/kritisch · Reiseflughöhe = alles erledigt · Druckverlust = Störung · Turbulenzen = Belastung · Briefing/Crewdurchsage · Crew-Chat · Flight Rules = Gesetzestexte · Destinations = fällige Aufgaben · Autopilot = Verwaltung · Logbuch = Briefing-Archiv.

**Cross-Cutting mit DB-Relevanz:** Lesebestätigung kann aus drei Wegen entstehen (Reader, Briefing-Verweis, Auto-Quittierung der Schulungs-Aufgabe) — dieselbe Entität.

---

## Was ist schon gebaut vs. neu

**Vorhanden (nutzen):** Benutzer/Rollen, Audit-Trail, Aufgaben (Definition/Fälligkeit/Erledigung/Nachweis/Abwesenheit), Dokumente (Dokument/Version/Lesebestätigung/Lesepflicht/Schulungsstand).

**Neu zu bauen (grob nach Aufwand):** Briefing + Crew-Chat · Nachweis-Subtypen (Checkliste/Messwert/Vier-Augen/Signatur/Zähler) · Aufgaben-Freigabe-Workflow · Eskalationsregeln · Vertretungs-Workflow · **Lieferanten (mit Akte + Freigabe)** · Dienstleister · Inventar · **Temperatur (Logger/Exkursion)** · OCR-Suche + Verweise · Turnus-Override · **CAPA** · KPI/Berichte/Exporte · Rechte-Matrix · M365-SSO + System/Backup.

---

## Offene Abstimmungspunkte (bitte bestätigen/korrigieren)
1. Zählweise „täglich": Aufgabe zählt 1×/Tag, nach Erledigung erst am Folgetag wieder fällig — korrekt?
2. Eskalation: 2 Tage → RP, ≥10 Tage → GL, Schulung → QMB — feste Werte oder je Mandant konfigurierbar?
3. Vier-Augen und Messwert→Pan-Pan→CAPA sind die komplexesten Abläufe — höchste Sorgfalt; Reihenfolge beim Bauen abstimmen.
4. „Dokumente verwalten" und der Selbstauskunfts-Fragebogen-Generator (Lieferanten-Erstanlage) waren im v2 noch Backlog — später ergänzen?
