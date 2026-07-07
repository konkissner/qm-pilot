# Reinigungsmodul — Spezifikation (aus Jochens Design-Prompt, 06.07.2026)

**Einordnung:** Menü „Reinigung" unter **Betrieb**, sortiert direkt unter „Temperatur".

## Reinigungsaufgabe anlegen — Pflichtangaben
- **Wo** — Ort/Bereich (z. B. Waschraum, Teeküche, Regale)
- **Wer** — Zuständigkeit (Reinigungsaufgaben sind durch **alle** Mitarbeiter erledigbar)
- **Womit** — Reinigungsmittel → Verweis auf A-03-007 Reinigungsmittel-Liste/SDB
- **Wie oft** — Frequenz/Turnus (wie Aufgaben-Modul)
- *Ergänzend sinnvoll (GDP):* Sollzustand/Prüfkriterium, Nachweis-Art, Verweise Hygieneplan A-03-002 / SOP-03-004 / SOP-07-001, Reinigungs-Checkliste F-03-014, Reinigungsbericht F-03-015
- **Freigabe** wie in anderen Modulen (Ersteller ≠ Prüfer ≠ Freigeber, Audit).

## Darstellung freigegebener Reinigungsaufgaben
- Klickbare Zeile (wie überall), Angabe **„letzte Ausführung"**.
- Pill **„Verlauf"** → alle Ausführungen, sortierbar.
- Pill **„QR-Code"**.
- Aus dem Modul resultieren die Reinigungsaufgaben in der allgemeinen **Aufgaben**-Ansicht (Fälligkeit/Turnus).

## Spezialfunktion: QR-Code-Quittierung
- Nach Freigabe: Klick „QR-Code" → Fenster mit **eindeutigem, der Aufgabe fest zugewiesenem QR-Code** (Firmenlogo mittig).
- Ausdrucken + dauerhaft am Reinigungsort anbringen (z. B. Toilettentür).
- Reinigungskraft **scannt QR → Pilot-Seite → PIN-Eingabe → Reinigung quittiert** (kein Voll-Login nötig).
- Mehrfach-Scan pro Tag möglich, aber **max. 1×/Stunde je Aufgabe**.

## Alternativer Weg (ohne QR)
- PIN-Login am Piloten → Reinigungsaktion auswählen → **Regeln anzeigen** (Wo/Womit/…) → bestätigen → Rückfrage **„Reinigung bestätigen? JA/NEIN"**.

## Erfassung & Nachweis
- Jede Reinigungsaktion → **Audit-Trail** (Person via PIN, Zeitstempel). ALCOA+.
- Einsehbar über Pill auf der Zeile der Reinigungsaufgabe, **sortierbar**.

## Geräte-Verifizierung (wichtig!)
- Das Gerät, auf dem PIN-Anmeldung/Quittierung funktioniert, muss **verifiziert** und in den **Stammdaten der Reinigungskraft als „sicher" hinterlegt** sein.
- Ein Gerät kann **mehreren Mitarbeitern** zugeordnet sein.

## Offene Punkte / beim Bau klären
1. **Gilt die Geräte-Verifizierung auch für den QR-Scan-Weg?** Sonst könnte jedes fremde Smartphone nach Scan + PIN quittieren. Empfehlung: ja — nur registrierte Geräte dürfen quittieren; **oder** QR-Token + persönliche PIN werden bewusst als ausreichender Nachweis definiert. → entscheiden.
2. **QR-Token** eindeutig + nicht erratbar (zufälliges Token in der URL); PIN-Sperre nach Fehlversuchen (im Datenmodell bereits vorhanden: `pin_fehlversuche` / `pin_gesperrt_bis`).
3. **„1×/Stunde"**: Verhalten beim 2. Scan innerhalb der Stunde — Hinweis „bereits quittiert", keine Doppelerfassung.

## Architektur-Einordnung
Baut auf dem **Aufgaben-Modul** (Wiederholung/Fälligkeit/Nachweis) und dem **PIN-Login** auf (beides bereits vorhanden: `User.pin_hash`, Reinigungs-Ansicht aus Stufe 0/1). QR-Quittierung = zusätzliche Nachweis-/Erledigen-Variante. Gut umsetzbar; neu sind v. a. QR-Token je Aufgabe und die Geräte-Registrierung in den Benutzer-Stammdaten.
