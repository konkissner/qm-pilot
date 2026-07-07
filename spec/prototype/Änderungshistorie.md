# QM-Pilot – Redesign & Exploration · Entwicklungshistorie

## Zwischenstand 05.07.2026 — Change Control + CAPA-Verknüpfung (GELOCKT)
Arbeitsdatei: **`QM-Pilot Prototyp v2.dc.html`** · Locks: `CLAUDE.md`.
- **Change Control** (Quality, unter CAPA): sortierbares Register, klickbare Zeilen, Verantwortlich-Spalte + Cockpit-Aufgabe, „+ Change beantragen" (Situation/Ziel/Grund, permanent/temporär, major/minor, Risiken, Referenz RA+SOP), Ablauf Antrag→Bewertung→Genehmigung(VP)→Umsetzung→Abschluss.
- **CAPA↔Change:** „⇄ Change aus dieser CAPA beantragen" (vorbefüllt), beidseitig klickbare Verknüpfung. Alles Audit-Trail.
- Feasibility-Prüfung aller 320 GDP-Anforderungen dokumentiert in `extracted/feasibility-320.md` (nur Analyse, keine App-Änderung); erste Lücke „Change Control" geschlossen.
- Gelockt gemäß CLAUDE.md „CHANGE-CONTROL-MODUL GELOCKT (05.07.)".

## Zwischenstand 05.07.2026 — Benutzer / Admin / Berichte / Vertretung / Erledigt (GELOCKT)
Arbeitsdatei: **`QM-Pilot Prototyp v2.dc.html`** · Locks: `CLAUDE.md`.
- **Benutzerverwaltung (GL/QMB/Admin):** sortierbar, aktive vs. ausgeschiedene (extra Tabelle), Detail mit editierbarem Namen + Rollen-Toggles + Einzelrechten + Ausscheiden; Rollen-/Rechte-Editor (Module + Eingaberechte) auch über die Rechte-Matrix; „+ Auditor einladen" (Zeitfenster von–bis, feingranulare Sichtauswahl, Vorlage speicherbar, autom. Ausscheiden nach Ablauf). Mehrfachrolle Michael = GL + Administrator (ein Login, Admin-Kontext im Nav).
- **IT-Admin (System & Backup):** funktionale Schalter (SSO/PIN/2FA/Auto-Sperre, Saveris/ERP/Audit-Trail), Session-Timeout, Aufbewahrung, Backup ausführen + sortierbare Historie, strukturierte Firmenstammdaten mit Footer-Vorschau.
- **Berichte:** RP-Unterschrift/Freigabe, Internes Audit (i.O./n.z./n.i.O. je Zeile → CAPA-Nachfrage → vorbefüllte Maske → klickbare Verknüpfung + „CAPA erledigt am"), Jahresbericht-Exporte, klickbare KPI-Kacheln mit Detailfenster (Briefings → referenziertes Dokument), Flugstil-Piktogramm.
- **Meine erledigten Aufgaben:** Live-Counter aus doneLog, sortierbar, KPI-Kacheln → Detailfenster.
- **Vertretung/Urlaub:** Antrag mit zwingender Vertretung (außer geteilt/Schulung), Genehmigung RP/QMB/GL, Umleitung aller Aufgaben außer Schulung, autom. Ende nach Urlaub.
- Alles gelockt gemäß CLAUDE.md „BENUTZER-, ADMIN- & BERICHTE-MODUL GELOCKT (05.07.)".

## Zwischenstand 05.07.2026 — Schulungs- & CAPA-Modul (GELOCKT)
Arbeitsdatei: **`QM-Pilot Prototyp v2.dc.html`** · Locks: `CLAUDE.md`.
- **Schulungen / Meine Schulungen / Schulungsstand:** dynamisch aus `trainings`/`trainDone`/`extTrainings`; Erstellen mit Freigabe, Turnus global/individuell, Gruppen-/Personen-/„Alle"-Zuweisung, externe Schulungen mit Quittierung + PDF, Mitarbeiter-Sicht (wiederholbar, Inhalt/Dokument klickbar), Schulungsstand mit klickbaren KPIs + Drill-down + Erinnern.
- **CAPA (Quality):** vollständiger Abweichungs-/CAPA-Prozess (Erfassen → Ursachenanalyse → Maßnahmen → Wirksamkeitsprüfung → Abschluss RP), Klassen kritisch/major/minor, korrektiv/präventiv-Maßnahmen, Nachweis-Upload, Info Kunde/Behörde, Betrieb-Verknüpfung; kritische CAPA automatisch im Pan Pan; Temperatur „+ CAPA" & Fracht-CAPA legen echte CAPA-Fälle an. `select.inp`-CSS gegen schwarze Ränder.
- Alles gelockt gemäß CLAUDE.md „SCHULUNGS- & CAPA-MODUL GELOCKT (05.07.)".

## Zwischenstand 05.07.2026 — Dokumente-Modul (echtes QM-Handbuch, GELOCKT)
Arbeitsdatei: **`QM-Pilot Prototyp v2.dc.html`** · Datenbasis: **`qm-docs.js`** (aus echtem QM-Handbuch + GDP-Anforderungskatalog) · Locks: `CLAUDE.md`.

- **Echter Katalog (171 Dokumente):** QM-Handbuch, 41 SOPs (Volltext, 12 Abschnitte), 76 Vordrucke + 43 Anlagen transkribiert, 10 Regelwerke. Reale Nummerierung; Cockpit/Aufgaben/Schulung/Briefing migriert.
- **3-stufige Dokument-Freigabe** Erstellt → Geprüft → Freigegeben (Ersteller ≠ Prüfer ≠ Freigeber), je Stufe Audit; Zurückweisung + Wiedereinreichung; rote Cockpit-Karte „Zurückgewiesen — bitte überarbeiten" beim Ersteller.
- **Verweise/Rückverweise** im Reader (gruppiert, klickbar, zwei-Wege); Volltext-Anzeige inkl. **echter Tabellen** (` | `-Parser).
- **Kapitel 10 Broker** mit Anwendbarkeit „nicht zutreffend"; **Dokumentenlücken-Prozess** (erstellen → Freigabe → Lücke schließt); **strukturierter SOP-Editor** (fixe Überschriften 🔒); **Druckansicht** (Volltext/Tabellen, Firmenanschrift aus Admin-Einstellungen).
- Alles gelockt gemäß CLAUDE.md „DOKUMENTE-MODUL GELOCKT (05.07., Runde 2)".


## Zwischenstand 04.07.2026 (Abend) — Flight Rules & Temperaturmapping
Arbeitsdatei: **`QM-Pilot Prototyp v2.dc.html`** · Locks & Arbeitsregeln: `CLAUDE.md`.

**Flight Rules (Dokumente):**
- Einheitlicher Freigabeprozess (Muster für alle Module, in CLAUDE.md verankert): Klick auf Zeile → Detailansicht mit allen Details; „Link öffnen ↗" bzw. „Dokument ansehen" (mit Platzhalter-Viewer) Pflicht vor Freigabe („✓ angesehen"); Ablauftermin per Datumsmaske TT.MM.JJJJ **oder** Schnell-Pills 1/2/3 Jahre (Pills setzen nur das Datum, Freigabe nur über „✓ Freigeben"); Vier-Augen (Sara bei RP-Anlage); sichtbar für alle erst nach Freigabe; Ablauf-Reminder (1 Monat) im Cockpit; Audit.
- Anlage: Link ODER Datei (gegenseitig ausschließend, beides → Fehlerhinweis).
- „Öffnen"-Pill in jeder Zeile (Link → neuer Tab, Dokument → Detail/Viewer), wie beim Musterdokument GDP-Leitlinie.
- Freigegebene Einträge wandern unter die Gesetzestexte-Liste; oben nur offene Freigaben (GL/RP/QMB/Stellv.).
- Sara sieht offene Freigaben klickbar im Cockpit unter „Aufmerksamkeit erforderlich".
- Absturz behoben (meName-TDZ in der Cockpit-Freigabezeile).

**Temperaturmapping (Setup):**
- Messpunkte per Maus verschiebbar (Drag, kein Geisterpunkt); Klick auf Logger/Listeneintrag → Punkt blinkt + ausgewählt; Klick auf Skizzen-Punkt → Listenzeile grün hervorgehoben.
- Bearbeitungspanel (Höhe-Pills + „Höhe in cm", Logger-Suche/-Liste, „Punkt entfernen") klappt direkt **unter der jeweiligen Zeile in der Punktliste** auf (nicht mehr über der Skizze); ganze Zeile klickbar.
- Punktliste zeigt Höhe je Logger; Flieger-Piktogramme statt 📟/📍 überall im Mapping.
- Upload-Pill wechselt nach Upload zu „Skizze ändern"; Hinweistext „Punkte lassen sich…" entfernt.
- „Messdurchlauf starten" ausgegraut, bis ≥1 Messpunkt mit Logger existiert.
- Bereits zugewiesene Logger verschwinden aus der Auswahlliste (kein Doppel), tauchen nach Entfernen wieder auf.
- Ferner: „Remapping starten" + „Mapping aus Dokument hochladen" (auch bei Raum-Neuanlage); Beladungs-Variante während laufendem Mapping fixiert.

**Offen / nächste Schritte:** restliche Lena-Seiten (Inventar-Rest, Berichte, Benutzer, Schulungen), danach Rollen ableiten: Jana/Paul (operativ), Externe, Auditor, Admin.

---

## Zwischenstand 04.07.2026 — Lieferanten-Modul komplett
Arbeitsdatei: **`QM-Pilot Prototyp v2.dc.html`** · Locks & Arbeitsregeln: `CLAUDE.md`.

**Lieferanten-Neuanlage / Bearbeitung (GL, RP, QMB):**
- Vollständige Erfassung: Name, Typ, Erlaubnis, Land, Anschrift, Telefon, E-Mail · **mehrere Kontaktpersonen** (je Name, Funktion ab 2. Person, E-Mail, Telefon) · Verantwortliche Person, QMB und **Zuständige Behörde** jeweils mit E-Mail + Telefon · Kontodaten komplett (Bank, Bank-Anschrift fakultativ, Kontonummer, Branch, IBAN, SWIFT, Routing).
- **Unterlagen-Upload** (mehrere Dateien): je Unterlage Bezeichnung (Freitext + Kurzauswahl-Pills Großhandelserlaubnis / Herstellungserlaubnis / GDP-Zertifikat), Ausstellungsdatum, Gültig bis **oder** „unbegrenzt gültig". Datumsfelder mit fester Maske TT.MM.JJJJ.
- Neuer Lieferant zeigt ehrlich „Erstqualifizierung offen" (kein „Fragebogen versendet"); hochgeladene Unterlagen erscheinen in der Akte, Standard-Einträge als „ausstehend".
- „Stammdaten bearbeiten" in der Detailansicht; Änderung durch Nicht-RP → Quittierungspflicht der RP (Cockpit-Hinweis + Banner, ✓ Quittieren, Audit).

**Freigabe-Workflow Lieferant:**
- Pill „Zur Freigabe an RP" oben in der Detailansicht (solange Erstqualifizierung, nicht eingereicht).
- RP sieht Anforderung im Cockpit, prüft Akte, **Freigabe nur mit ausgefüllten Feldern** „Freigegeben bis" + „Nächstes Audit" (sonst roter Hinweis) → Lieferant wird qualifiziert. Alternativ Rücksendung mit Pflicht-Kommentar → Anlegende:r sieht Hinweis im Cockpit + rote Karte, kann nacharbeiten und erneut einreichen.

**Qualifizierungsakte:**
- Jeder Eintrag mit Anlagedatum; Dokument-Detail mit **nutzbarer Kommentarfunktion** (wachsendes Feld, Person + Zeitstempel, Audit).
- **Archiv „Alte Dokumente":** abgelaufene Unterlagen (Gültig bis überschritten) wandern automatisch dorthin („abgelaufen — automatisch archiviert"); GL/RP/QMB können Dokumente manuell archivieren — nur mit Kommentar („archiviert von … am … · Kommentar", Audit).
- **Ablauf-Frühwarnung:** 1 Monat vor Ablauf automatische Meldung an RP/QMB im Cockpit („Unterlage läuft ab …", Klick → Akte). Demo: GDP-Zertifikat Helvetia (28.07.2026).

**Global:** Text-Overflow-Regel verschärft — Freitext-Eingaben immer als wachsende Textarea (`.taGrow`), Anzeigetexte mit Umbruch (Achtung `.mono` nowrap überschreiben); Topbar-Titel-Kollaps behoben.

**Backlog:** Bei Erstanlage eines Lieferanten automatisch Selbstauskunfts-Fragebogen gemäß SOP generieren — später im Detail ausarbeiten.

**Offen / nächste Schritte:** restliche Lena-Seiten (Dienstleister-Detail, Temperatur, Inventar, Berichte, Benutzer, Schulungen), danach Rollen ableiten: Jana/Paul (operativ), Externe, Auditor, Admin.

---

## Zwischenstand 03.07.2026 (Abend) — Klickdummy „QM-Pilot Prototyp v2.dc.html"
Arbeitsdatei bleibt **`QM-Pilot Prototyp v2.dc.html`**; Locks & Arbeitsregeln in `CLAUDE.md`.

**Seit dem letzten Stand umgesetzt:**
- **Aufgaben anlegen (GELOCKT):** mehrere Quelldokumente (Mehrauswahl-Pills + Suche), Zeitplanung je Frequenz, wöchentlich mit mehreren Wochentagen, 10 Nachweisarten (Scan & Vordruck entfernt), Checkliste mit eigenen Punkten oder Vorlage, Vier-Augen-Konfiguration (frei / immer RP / immer QMB), Zuständige mehrfach + gelbe „ganze Gruppe"-Pill.
- **Freigabe-Workflow:** Aufgaben mit SOP-Bezug warten auf Freigabe (RP bzw. Stellv. RP bei RP-Anlage); Freigabe-Zeile im Cockpit unter „Aufmerksamkeit erforderlich", klickbar zum Bearbeiten (Pills „Keine Änderungen"/„Änderungen speichern"), Freigeben erst nach Ansicht; Quelldokumente dort ergänzbar/entfernbar.
- **Aufgaben-Erledigung:** echte Nachweisfunktionen (Datei/PDF/Foto/CSV mit echtem Dateidialog + Drag&Drop, Kamera-Aufruf, digitale Unterschrift, Checkliste abhaken, Messwert mit Soll-Bereich, Zähler, wachsender Freitext); Quittieren gesperrt bis alle Nachweise da; Bezugs-SOPs als Vorschau-Fenster (lesbar, „SOP öffnen" / ✕).
- **Messwert-Grenzwertverletzung → echte Pan-Pan-Meldung**; RP quittiert mit Pflichtkommentar, kann dabei **CAPA auslösen** (erscheint real unter Quality → CAPA, laufende Nummer).
- **Vier-Augen:** 2. Person sieht alle Nachweise der 1. (Dateien ansehbar, Checklistenpunkte einzeln, Abweichungen rot markiert) und muss Korrektur eintragen oder mit Kommentar quittieren (Ersteintrag bleibt im Audit-Trail).
- **Lieferanten:** klickbare KPI-Filter, sortierbare Spalten (Standard: Name aufsteigend), Spalte Land (ISO-2), Neuanlage (GL/RP/QMB, wachsendes Namensfeld), Trennung Lieferanten (Großhändler/Hersteller) vs. Dienstleister (Transporteure MediLog/TransSwift, MediLog-Akte dort verlinkt); Detailansicht mit klickbarer Qualifizierungsakte (Anlagedatum je Eintrag, Dokument-Detail mit Kommentaren + Freigabe), „Alte Dokumente" (archiviert), erweiterte Stammdaten inkl. mehrzeiliger Anschrift und vollständiger Kontodaten (Bank, Kontonummer, Branch, IBAN, SWIFT, Routing).
- **Global:** Text-Overflow-Schutz überall (h1, Breadcrumb, Tabellenzellen, muted, Modal-Köpfe, Eingabefelder als wachsende Textareas) — als ständige Regel in CLAUDE.md verankert.

**Backlog:** Bei Erstanlage eines Lieferanten soll die Software künftig automatisch einen Selbstauskunfts-Fragebogen gemäß SOP generieren — Funktion später im Detail ausarbeiten.

**Backlog (Erinnerungen):**
- **CAPA-Modul:** Wenn das CAPA-Modul bearbeitet wird, daran erinnern: CAPA-Starts aus Temperatur/Frachten (mit Beschreibung) sollen dort als vollwertige Prozesse weitergeführt werden können (Ursache, Maßnahme, Wirksamkeit).
- **Benutzerverwaltung:** Wenn die Benutzerverwaltung bearbeitet wird, daran erinnern: Einstellung „Fracht-Freigabe durch RP & QMB / nur RP / nur QMB" dort einbauen (Standard: RP & QMB).

**Offen / nächste Schritte:** restliche Lena-Seiten durchgehen (Dienstleister-Detail, Temperatur, Inventar, Berichte, Benutzer, Schulungen), dann Rollen ableiten: Jana/Paul (operativ), Externe, Auditor, Admin.

---

## Zwischenstand 03.07.2026 — Klickdummy „QM-Pilot Prototyp v2.dc.html"
Arbeitsdatei für die Rollen-Iteration ist **`QM-Pilot Prototyp v2.dc.html`** (v1 bleibt als Stand davor erhalten). Rollen-Umschalter oben rechts (7 Personas: GL Michael, RP·QMB Lena, Lagercrew Jana, Servicecrew Paul, Externe/PIN, Auditor, Admin). Locks & Arbeitsregeln stehen in `CLAUDE.md`.

**Gelockt (abgenommen):** Einheitsschrift Hanken Grotesk · Sidebar-Gliederung (inkl. Pan Pan, KPI unter Quality, keine „bald"-Einträge) · Cockpit komplett (Lagebild, Großwetterlage, Aufmerksamkeit erforderlich mit „Briefing durchgeführt", Briefing mit Crewdurchsage/Verweis-Suche/Lesebestätigungs-Pflicht nach Verweis-Öffnung, Logbuch-Suche, Piktogramme, Crew-Chat mit Datum) · Meine Aufgaben komplett (inkl. Eskalationskarte, Gruppier-Pill, Reiseflughöhe-Leermeldung) · Alle Aufgaben (KPI-Karten, MA-Auswahl ab 10 nach Rollen + Suche, sortierbare Spalten, klickbare Aufgaben zum Selbst-Erledigen) · Aufgaben anlegen komplett (Frequenzen + Zeitplanung, 12 Nachweisarten alphabetisch, Mehrfach-Zuständige + gelbe „ganze Gruppe"-Pill).

**Zuletzt (03.07., noch ohne Lock-Vermerk):** KPI-Karten-Optik auf Lieferanten/Dienstleister/Inventar/CAPA/Benutzer/Berichte/Erledigt (Donuts bei Schulungsstand bleiben) · KPI-Seite unter Quality · Cockpit-Überschriften („Aufmerksamkeit erforderlich" / „Meine Destinations heute") volle Breite, Briefing bündig · Logo klickt zu pharmazeutika.net.

**Offen / nächste Schritte:** Restliche Seiten Lenas durchgehen (Dienstleister, Temperatur, CAPA, Berichte, Benutzer, Pan Pan …), danach Rollen ableiten: Jana/Paul (operativ), Externe, Auditor, Admin.

---


**Projekt:** Pharmazeutika 73.3 GmbH · QM-Pilot (GDP / eQMS)
**Stand:** 01.07.2026
**Hauptdatei:** `QM-Pilot Redesign.dc.html` (+ Komponente `Sidebar.dc.html`, `assets/logo.png`, Runtime `support.js`)

Die Datei ist ein Design-Canvas: pro Bereich ein Abschnitt, je Abschnitt mehrere
Optionen nebeneinander (referenzierbar über IDs wie `1a`, `7c`). Frei zoom-/verschiebbar.

---

## Design-System
- **Marke/Farben** (aus MandantConfig): Türkisgrün `#38B098`, Dunkelgrün `#0f6e56`,
  Warmrot `#E03010`, Gelb `#FFC02E`, Lila `#7C4DFF`.
- **Schrift:** Hanken Grotesk (UI), Space Grotesk (Kennzahlen). Mono nur bewusst dosiert.
- **Metapher „Pilot":** Cockpit, Flugstatus, Crew, Briefing, Destinations, Crew Rest.

## Übersicht der Screens (Abschnitte)
- **01 Cockpit** — 1a Refined (hell), 1b Flight Deck (dunkel), 1c Leerer Zustand („Crew Rest")
- **02 Aufgaben** — 2a gruppierte Liste, 2b Status-Board
- **03 Dokumente & Schulung** — 3a Dokumentenlenkung, 3b Schulungsstand (QMB)
- **04 Audit-Trail** — 4a Tabelle, 4b Timeline (QMB)
- **05 Benutzer & Rollen** — 5a Tabelle, 5b Roster-Karten (QMB)
- **06 Persönliche Einstellungen & Abwesenheiten** — 6a (per Klick auf Namensfeld)
- **07 Gefilterte Aufgaben-Ansichten** — 7a Heute, 7b Überfällig, 7c Alle offenen,
  7d Regelmäßig, 7e Gruppiert nach Quelldokument
- **08 Mein persönlicher Audit-Trail** — 8a (per Klick auf Benutzer-Kachel unten links)
- **09 Dokumente & Schulung · Stufe 2 (URS-abgeglichen)** — 9a Dokumentenübersicht
  (SOP/Vordruck/Anlage/Gesetzestext, gültig/veraltet), 9b Leseansicht (Metadaten,
  Verweise-Liste, Versionshistorie, Lesebestätigung), 9c Volltext-Suche (Treffer
  nach Dokumentart gruppiert, OCR-Kennzeichnung)
- **10 Schulung verwalten (QMB)** — 10a Schulungsplan & Turnus (global + Override),
  10b Dokument-Übersicht „Wer fehlt noch" mit Erinnern, 10c Schulungsregister (append-only, Export)
- **11 Rollen-Rechte-Matrix** — 11a Matrix Funktionen × Rollen, 11b Rollen-Karten
- **12 Lieferanten** — 12a Tabelle mit GDP-Qualifizierungsstatus, 12b Detail-Akte (Nachweise, Historie, verknüpfte Aufgaben)
- **13 Inventar** — 13a Verzeichnis mit Prüf-/Kalibrierstatus, 13b Zonen-Ansicht mit Live-Temperatur
- **14 Vertretungs-Workflow** — 14a 4-Schritte-Übersicht (Jana, wartet auf Bestätigung),
  14b Sicht der Vertretung (Sara) mit Annehmen/Ablehnen + Schulungs-Check
- **15 Tablet-Kiosk Reinigung** — 15a PIN-Anmeldung, 15b Kiosk-Aufgaben (große Touch-Ziele, Foto-Nachweis)
- **16 Detailansichten** — 16a Foto/Kommentar-Viewer (revisionssicher, Prüfsumme),
  16b PDF-Nachweis-Export (Umfang/Zeitraum, signierter Bericht)

## Wichtige Konzepte & Logik
- **Flugstatus (automatisch, immer nur EIN Status):** ≥1 überfällig → „Achtung Druckverlust"
  (rot, Vorrang) · >5 heutige Aufgaben → „Leichte Turbulenzen" (gelb) · sonst „Kurs stabil" (grün).
  Klick auf den Status-Chip in der Topbar → Ansicht der überfälligen Aufgabe (7b).
- **Zählweise:** Tägliche Aufgaben zählen 1× pro Tag (1× Heute, 1× Alle) und sind nach
  Erledigung erst am Folgetag wieder fällig.
- **Rollenbasierte Sichtbarkeit:** Mitarbeitende sehen reduziertes Menü
  (Cockpit, Meine Aufgaben, Lieferanten, Inventar, Dokumente, Vordrucke);
  QMB/Admin sehen zusätzlich Verwaltung, Schulungsstand, Audit-Trail, Benutzer, CAPA, Berichte.
- **Rollen-Taxonomie:** Admin/Superuser (technisch, kein QM-Input), Geschäftsleitung (GL),
  Verantwortliche Person (RP), QMB, Stellvertretende RP, operative Mitarbeitende,
  Externe (z. B. Reinigung), Auditor (Lesezugriff).
- **Persona:** User-Ansicht = Jana Reuter (operative Mitarbeiterin); QMB-Ansicht = Dr. Lena Frei.
- **Briefing:** Notizen von QMB/GL, Lesebestätigung → im Audit-Trail erfasst.
- **Crew-Chat** mit „Durchsage an das Team".
- **Globale Suche** in der Cockpit-Kopfzeile (durchsucht die gesamte Software).
- **Persönlicher Audit-Trail (8a):** erledigte Aufgaben, Filter + Datumssuche
  (Standard „Zeitraum" von–bis, Pill „Stichtag" für konkreten Tag); Einträge klickbar
  (Foto/Kommentar), aber revisionssicher/unveränderbar.

## Iterationsverlauf (Kurzfassung)
1. Codebasis (Django eQMS) analysiert, 5 Kernbereiche als Hi-Fi-Optionen neu gestaltet.
2. Cockpit 1a: Firmenname vollständig, kein Datum in Crew-Karte, Briefing + Crew-Chat,
   Flugstatus dynamisch; Logo in Sidebar zentriert; „Übersicht"/„Bald verfügbar" entfernt.
3. „Meine Destinations heute"; Flugstatus-Auto-Logik; Leerzustand 1c mit Briefing+Chat nebeneinander;
   Sidebar-Benutzerkarte immer sichtbar.
4. Namensfeld/Benutzerkarte klickbar; Zähler „Erledigte Tasks"; klickbare KPIs → gefilterte Ansichten (7x).
5. Gruppierung nach Quelldokument (7e); persönlicher Audit-Trail (8a) mit Datumssuche;
   blaue Emoji-Lupe durch dezentes Icon ersetzt; Status-Chip app-weit & klickbar;
   Lieferanten + Inventar im Menü; Rollen-Taxonomie; echte Persona (Jana Reuter).
6. Sidebar füllt volle Höhe; globale Suche in die Cockpit-Kopfzeile verschoben (immer sichtbar).
7. (01.07.2026) URS + FS/DS Stufe 2 „Dokumente & Schulung" gelesen und umgesetzt:
   Abschnitte 09–16 ergänzt. Reale Dokumentnummern-Systematik übernommen
   (SOP-XX-NNN, F-XX-NNN, A-XX-NNN, QMH, GT; Bestand: QM-Handbuch, 41 SOPs,
   70 Vordrucke, 40 Anlagen, Gesetzestexte). URS-D-Referenzen an den Optionslabels.
   Kernlogik abgebildet: Pflicht-Neulesung bei neuer Version (D-024), Turnus global
   12 Mon. + Override (D-022), Lesepflicht je Rolle/Person (D-045), Erinnerung/
   Eskalation über Stufe-1-Mechanik (D-025), Register append-only + 5 J. (D-027/038/042),
   Verweise-Liste (D-016), OCR-Volltextsuche (D-012).

## Klickbarer Prototyp
`QM-Pilot Prototyp.dc.html` — Vollbild-App mit echtem Zustand (01.07.2026):
- Persona-Umschalter Jana (Mitarbeiterin) ↔ Dr. Lena Frei (QMB) mit rollenbasiertem Menü
- Aufgaben erledigen mit Quittierungs-Dialog (Kommentar + Foto-Nachweis) → Zähler,
  Flugstatus (Druckverlust → Kurs stabil), persönlicher Nachweis (8a) und Audit-Trail
  aktualisieren sich live; Crew-Rest-Zustand bei 0 offenen
- Leseansicht mit Lesebestätigung: aktualisiert Schulungsquote, „Wer fehlt noch",
  Schulungsplan-Stand und Audit-Trail; Schulungs-Aufgabe wird automatisch quittiert
- Briefing-Lesebestätigung, Crew-Chat (senden), globale Live-Suche (gruppierte Treffer),
  Erinnern-Aktion (10b) erzeugt Audit-Eintrag
- Statisch: Lieferanten (+Akte), Inventar, Benutzer, Rechte-Matrix, Einstellungen, Vertretung
- Tweaks: Start-Persona und Start-Screen

## Offene / mögliche nächste Schritte
- Kiosk-Modus (PIN) in den Prototyp aufnehmen; Sicht der Vertretung (Sara) interaktiv
- QMB-Dialog „Dokument hinterlegen / neue Version in Kraft setzen" (Pflicht-Änderungsvermerk, D-007)
- Foto-Aufnahme-Schritt am Kiosk; PIN-Fehlversuche/Sperre
- Vertretungs-Kalender fürs Team; Krankmeldungs-Kurzweg über QMB
- Bestehende Screens 3a (alte Dokumentarten „Arbeitsanweisung/Formular") an die
  Stufe-2-Systematik von 9a angleichen — bewusst noch nicht angefasst, 3a/3b bleiben als ältere Iteration stehen
