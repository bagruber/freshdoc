# freshdoc

Word-Dokumente ins **fresh-Design** bringen und als PDF exportieren.
Geschwister-App zu [freshpost](https://github.com/bagruber/freshpost) —
gleicher Stack, gleiche Arbeitsweise, aber für Dokumente statt Sharepics.

## Was es tut

1. `.docx` hochladen (Drag & Drop)
2. Inhalte werden automatisch auf das helle fresh-Dokumentdesign gemappt:
   - **Titel, Untertitel, Überschriften 1–3** (Barlow Condensed, River/Rose)
   - **Textkörper** (Raleway)
   - **Markierungen vereinheitlicht auf drei Stile:**
     fett → *Betonung*, kursiv → *Begriff*, farbig/Marker → *Akzent* (Rose)
   - **Fußnoten** am Seitenende, **Seitenzahlen** in der Fußzeile
   - **Listen** (Rose-Dreieck als Aufzählungszeichen) und **Abbildungen** mit
     einheitlicher Beschriftung („Abb. n", Wind-Linie)
3. Paginierte Vorschau (paged.js, A4) → **PDF erzeugen** über den Druckdialog

Versteckt hinter dem „⋯"-Button: das Advanced-Panel, in dem sich jede erkannte
Quell-Formatierung manuell einem Zielstil zuordnen lässt.

## Entwicklung

```
npm run dev       # Vite Dev-Server
npm test          # vitest
npm run lint      # eslint
npm run build     # tsc + vite build
```

Rein clientseitig, deploybar auf GitHub Pages (Push auf `main` deployt
automatisch). Referenz-CI liegt in `context/`, ein Beispieldokument in
`example/`.

## Grenzen der V1

- Nur `.docx` (ODT ist als zweiter Parser auf dasselbe Dokumentmodell geplant)
- Tabellen werden übersprungen
- Nur direkte Zeichenformatierung (keine Zeichen-Formatvorlagen)
- DOCX-Export ist als Ausbaustufe 2 geplant
