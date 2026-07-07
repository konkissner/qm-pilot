# Abdeckungs- & Abnahmebericht — QM-Pilot (finaler Design-Stand)

**Projekt:** Pharmazeutika 73.3 GmbH · QM-Pilot (GDP-Pharmagroßhandel, §52a AMG + §73(3) Import)
**Grundlage:** GDP-Anforderungskatalog 320 Punkte · Lock-Liste `CLAUDE.md` · `Änderungshistorie.md` · Design-Stand 06.07.2026
**Vorbemerkung:** `feasibility-320.md` ist eine heuristische Frühprüfung (Stand ~05.07., vor Abschluss mehrerer Module) und an vielen Stellen **veraltet**. Wo die Lock-Liste das Modul als gebaut belegt, wird der Punkt als **abgedeckt** gezählt.

---

## 1. Gesamtbild final

Ausgangszahlen der Feasibility-Prüfung (320): 160 „ok", 117 „teilweise", 38 „offen?", 5 „nicht zutreffend" (Kap. 10). Nach Abgleich mit Lock-Liste und vereinbarten Klärungen:

| Kategorie | ca. | Bedeutung |
|---|---|---|
| **Im Design abgedeckt** | ~250 | Prozess funktional abgebildet, Lock-Liste belegt Abnahme |
| **Prozessual außerhalb** (SOP, physisches Handling) | ~35 | Physik/Verfahren per SOP; Pilot = Nachweis via Vordruck + Freigabe |
| **Technisch / Server-Seite** | ~15 | Backup/Restore, CSV-Validierung, Notfallplan |
| **Echt offen / zu verifizieren** | ~15–20 | siehe Abschnitt 4 |
| **Nicht zutreffend** (Kap. 10 Broker) | 5 | im Modul aktiv auf „nicht zutreffend" geschaltet |

**Einordnung:** Die Zahlen belegen **Prozessabdeckung im Klickdemo-Design**, nicht validierte Software. Ein Klickdummy-Nachweis ≠ Nachweis eines validierten Produktivsystems. Nach GAMP 5 fehlt der volle CSV-Zyklus (URS → FS/DS → Implementierung → IQ/OQ/PQ + Traceability). Der Stand ist ein **abnahmereifes Design-/Spezifikationsmodell**.

---

## 2. Abdeckung pro GDP-Kapitel

**Kap. 1 Qualitätsmanagement — abgedeckt.** QM-System, Managementbewertung, Rollen, Risikomanagement. „Änderungskontrolle" ist gebaut (Change-Control-Modul). *feasibility hier veraltet.*

**Kap. 2 Personal — abgedeckt.** RP/QMB, Rollen, Stellenbeschreibung, Schulungswesen. Retouren-Genehmigung RP → prozessual außerhalb + F-06-002 + RP-Freigabe. Hygiene = SOP.

**Kap. 3 Räume & Ausrüstung — überwiegend abgedeckt.** Temperaturmapping, Überwachung/Exkursionen/Alarme (→ CAPA), Kalibrier-/Wartungsstatus. Reinigung durch neues Reinigungsmodul (QR, Geräte-Verifizierung, „Bereits quittiert"). *Technisch offen (Server):* CSV comp. Systeme, Datensicherung, Systemausfall-Verfahren.

**Kap. 4 Dokumentation — abgedeckt.** 171 Dokumente, 3-stufige Freigabe (Ersteller≠Prüfer≠Freigeber), Versionskontrolle, Redline, Archiv, append-only Register, Aufbewahrung. Anonymisierung personenbez. Daten = DSGVO/Backend, zu verifizieren.

**Kap. 5 Betrieb — teils Design, teils Fremdsystem.** Lieferanten-/Kundenqualifizierung, Due-Diligence, Freigabe, FEFO, Wareneingang/Bestand; Fälschungsrisiko → CAPA. FMD/securPharm operativ in COBI.WMS (extern) — keine FMD-Anbindung im Pilot nötig. Lieferschein-/Kommissionier-/Transaktionsdaten im ERP/WMS — Systemabgrenzung, Schnittstelle im Design zu verifizieren.

**Kap. 6 Beschwerden/Retouren/Fälschungen/Rückrufe — abgedeckt (Nachweisebene).** Beschwerden/Rückrufe voll über CAPA. Retouren = SOP-06-002 physisch außerhalb; Pilot = F-06-002 + RP-Freigabe. Fälschungsverdacht/Behördenmeldung = SOP; Pilot = fristgesteuerter CAPA-Fall + Vordruck.

**Kap. 7 Ausgelagerte Tätigkeiten — abgedeckt.** Dienstleister-Modul vollständig (Vertrag, Qualifizierung/Audit, risikobasierte Frequenz).

**Kap. 8 Selbstinspektion — abgedeckt.** Internes-Audit-Modul (i.O./n.z./n.i.O. → CAPA-Auslösung + Verknüpfung), Berichte an GL. Neu: Selbstinspektions-Unabhängigkeitsregel.

**Kap. 9 Transport — teils Design, teils Fremdsystem/Vertrag.** Transport-Temperatur, Kühlkette/Kühlakku, Transport-Mapping, Exkursionsverfahren (→ CAPA). Fahrzeug-/Behälterqualifizierung, Notfalllieferungen = Transporteur-Vertrag/Dienstleister-Akte + SOP; Verpackungs-Qualifizierungsstatus im Design zu verifizieren.

**Kap. 10 Vermittler (Broker) — nicht zutreffend, korrekt gesetzt.** Aktiv auf „nicht zutreffend" (RP/QMB umschaltbar, Audit).

---

## 3. Cross-Cutting — im finalen Design vorhanden?

| Anforderung | Status | Beleg |
|---|---|---|
| **ALCOA+ / Audit-Trail durchgängig** | vorhanden | jede Aktion → unveränderlicher Eintrag mit Person + Zeitstempel. *Revisionssichere Unveränderlichkeit im Backend zu verifizieren.* |
| **Ereignis-Trigger** | vorhanden | Temperatur/Messwert → Pan Pan + CAPA; kritische CAPA autom. Pan Pan; Rückruf & Fälschung als fristgesteuerte CAPA; Überfällig → Eskalation. |
| **Rollen & Funktionstrennung** | vorhanden | Rechte-Matrix (Sichtbarkeit + Eingaberechte); Vier-Augen (Ersteller≠Prüfer≠Freigeber); CAPA-Abschluss QMB/RP getrennt; Selbstinspektions-Unabhängigkeit; PIN-Kiosk Externe/Reinigung + Geräte-Verifizierung. |
| **Aufbewahrung 5 Jahre** | vorhanden | append-only Register + Aufbewahrungsfrist. *Technische Löschsperre Backend-seitig zu verifizieren.* |

Design-Ebene durchgängig erfüllt; offen bleibt die technische Erzwingung beim Bau.

---

## 4. Echte Restpunkte (priorisiert)

**A) Design (kleiner Rest, im Klickdummy zu verifizieren):**
1. Verpackungs-/Behälter-Qualifizierungsstatus (Kap. 9) — Nachweisfeld in Transport-Akte.
2. ERP/WMS-Schnittstellen-Sichtbarkeit Kap. 5 (190–199): wie referenziert/beweist der Pilot extern geführte Transaktionsdaten.
3. Löschung/Anonymisierung personenbez. Daten (DSGVO) abbilden.

**B) Backend beim Bau (Spezifikation da, Umsetzung offen):**
4. Audit-Trail revisionssicher unveränderlich (append-only, Zeitstempel) erzwingen.
5. 5-Jahres-Aufbewahrung als harte Löschsperre im Datenmodell.
6. Rechte-Matrix serverseitig durchsetzen (nicht nur UI).

**C) Technik/Doku (Server — nicht Design):**
7. Backup/Restore + Notfall-/Wiederanlaufplan — Cron läuft; Restore-Test + Notfallplan nachziehen.
8. CSV nach GAMP 5: IQ/OQ/PQ, Testprotokolle, Traceability, Systembeschreibung.

**Bewusst KEINE Lücke** (Klärungen): Retouren-Physik (SOP-06-002), Fälschungssperre/Behördenmeldung-Physik (SOP), FMD/securPharm (COBI.WMS extern), bauliche Räume/Zutritt, Broker Kap. 10 (n.z.).

---

## 5. Fazit zur Abnahmereife

Der finale Design-Stand deckt die GDP-Anforderungen auf **Design-/Prozessebene weitgehend vollständig** ab. Alle Kernprozesse — Änderungskontrolle, 3-stufige Dokumentenlenkung, CAPA (mit getrenntem QMB/RP-Abschluss), Schulung, Selbstinspektion mit Unabhängigkeitsregel, Temperatur/Mapping, Lieferanten/Dienstleister, Reinigung (Kiosk + Geräte-Verifizierung), Berichte/KPI, Benutzer/Rechte-Matrix — sind abgebildet und in der Lock-Liste als abgenommen belegt.

**Empfehlung:** Das Design ist **abnahmereif als Spezifikations- und Klickdemo-Grundlage**. Vor produktiver GxP-Nutzung sind zwingend Punkt 4.B (Backend-Erzwingung von Audit-Integrität, Aufbewahrung, Rechten) und 4.C (CSV nach GAMP 5, Backup/Restore-Test, Notfallplan) abzuarbeiten. Der Klickdemo-Nachweis ersetzt den validierten Softwarenachweis nicht — er ist die belastbare Vorstufe.
