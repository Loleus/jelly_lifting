# Glut Żelek - Wieże

Gra platformowa 3D. Wspinaj sie pospiralnej wiezy, zbieraj klejnoty i unikaj przeszkod. Glut nie lubi się męczyć, więc największe brawa uzyskasz uzyskując jak najmniejsząilość skoków po zdobyciu szczytu (i zebraniu wszystkich klejnotów)

## Sterowanie

| Klawisz | Akcja |
|---|---|
| Lewo/Prawo lub A/D | Ruch |
| Gora lub Spacja | Skok |
| Dol lub S | Drzwi / Dzwignia |
| R | Restart poziomu |

## Elementy wiezy

- **Schodki** - podstawowe platformy. Drewniane
- **Windy** - ruchome platformy, plastry
- **Sprezyny** - wyrzucaja gracza w gore.
- **Klejnoty** - zbierz wszystkie aby zaliczyc poziom.
- **Checkpointy** - zapisuja postep na wiezy.
- **Drzwi** - teleportuja miedzy dwoma punktami. Stan i nacisnij Dol/S.
- **Zapadnie** - Schodki z kamieni. Po wejsciu chowaja sie w sciane na kilka sekund.
- **Dzwignie** - przelaczniki z kolorowa kulka. Dol/S wysuwa lub chowa polaczony schodek. Kulka zielona = wysuniety, czerwona = schowany.
- **Pilki** - kule patrolujace lub skaczace. Unikaj kontaktu.

## Zasady

- Aby zaliczyc poziom, musisz zebrac wszystkie klejnoty i dotrzec na szczyt wiezy. Liczy się jak najmniejsza liczba skoków.
- Zegar startuje przy pierwszym ruchu.

## Technologia

- Three.js (WebGL)
- React + TypeScript
- Vite
- Tailwind CSS

## Uruchomienie

npm install
npm run dev

## Tylko pliki lokalne

Wszystkie wymagane tekstury, fonty, ikony i grafiki zostały zapisane lokalnie
z `Loleus/jellydev` (gałąź `dev`) i są teraz częścią tego projektu.
`npm run dev`, `npm run build` i `npm run preview` nie pobierają plików
projektu z GitHuba, nie przywracają źródeł i nie generują zamienników assetów.
Edytuj kod, poziomy i edytor bezpośrednio w tym projekcie.

Build zachowuje lokalne testy regresji. Brakujące tekstury w `src/textures/`
oraz fonty, ikony i grafiki w `public/` trzeba dodać lokalnie; sprawdzenie
przed buildem zgłosi ich ścieżki i zatrzyma niekompletną paczkę.
Instalacja zależności przez `npm install` pozostaje osobnym krokiem.

## Autor

Loleus
