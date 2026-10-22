# Clash of Taddel

3D-Echtzeit-Kartenduell im Stil von Clash Royale – mit Figuren aus dem Multiversum der Serien, Filme und Videospiele
(Mario, Darth Vader, Shrek, Pikachu, Gandalf, Iron Man, Godzilla, Goku …). Fan-Projekt ohne Gewinnabsicht.

- **Kampf gegen Computer** – Trophäen sammeln, 6 Arenen freischalten, neue Karten bekommen
- **Online-Duell** – zufälliger Gegner oder Raum-Code für Freunde; der Server rechnet das Spiel (keine Schummelei)
- **Deck-Bau** – 39 Karten (Truppen, Gebäude, Zauber), 3 Deck-Plätze, Karten-Level bis 9
- **Fortschritt wie im Original** – Truhen mit Freischalt-Zeit, Gratis- und Kronentruhe, Gold & Edelsteine (kein Echtgeld),
  Königslevel, Trophäenpfad, tägliche Aufgaben, Shop mit Tagesangeboten
- **Ereignisse** – Dreifach-Elixier, Plötzlicher Tod, Spiegel-Duell, Zufallsdeck, Trainingslager (gegen Computer oder online)
- **Profil** – Statistiken, Lieblingskarte, Kampfprotokoll

## Starten
```
npm install
npm start          # http://localhost:10000
```

## Render
Web Service, Build: `npm install`, Start: `npm start`.

## Aufbau
- `public/logik.js` – Spiellogik (läuft im Browser und auf dem Server)
- `public/grafik.js` – 3D-Grafik mit Three.js (Arena, Türme, Figuren, Effekte, Kartenbilder)
- `public/spiel.js` – Oberfläche, Steuerung, Computer-Gegner, Online
- `server.js` – liefert das Spiel aus und rechnet Online-Duelle (WebSocket)
