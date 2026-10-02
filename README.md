# Barcode – Inventar- und Verkaufsverwaltung für Auktionen

Webanwendung (PWA), die einen manuellen Excel-Prozess für Auktionsware ersetzt:
Artikel werden aus einem Excel-Katalog importiert, erhalten automatisch einen Barcode
(Code128), und per Scan werden Artikeldaten und Verkaufsstatus sofort angezeigt.

Entwickelt für einen realen Nutzer aus dem Auktionsbereich, im täglichen Einsatz.

## Funktionen
- Excel-Import des Katalogs (LotNo, Kategorie, Titel, Beschreibung, Preis, Verkäufer, Größe)
- Automatische Barcode-Erzeugung pro Artikel
- Scan → Anzeige von Artikel- und Verkaufsstatus
- Nutzung auf dem Smartphone als PWA

## Tech-Stack
Next.js · Supabase (PostgreSQL) · Vercel · PWA

## Lokal starten
```bash
npm install
cp .env.example .env.local   # Supabase-Zugangsdaten eintragen
npm run dev
```

## Hinweise
Entwickelt mit KI-gestützten Werkzeugen (Claude Code).
