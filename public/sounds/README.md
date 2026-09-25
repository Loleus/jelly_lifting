# `public/sounds/` — docelowe pliki mp3

Silnik dźwięku (`src/soundEngine.ts`) generuje obecnie **wszystko proceduralnie przez
Web Audio API**. Docelowo pliki mp3 stąd mają to zastąpić — gotowy kod loadera jest
zakomentowany na końcu `src/soundEngine.ts` (blok „MP3 MODE”), a ścieżki trzyma
stała `SOUND_FILES` u góry tego pliku.

Wrzuć poniższe pliki i odkomentuj blok — API jest identyczne, więc reszta projektu
nie wymaga żadnych zmian.

## Efekty (FX)

| Plik                  | Zdarzenie w grze                                             |
| --------------------- | ------------------------------------------------------------ |
| `fx-jump.mp3`         | podskok ludzika                                              |
| `fx-super-jump.mp3`   | podskok na sprężynie                                         |
| `fx-land.mp3`         | opadanie na schodek (schodzenie **i** zeskok/podskok); ciężki glut uderza w drewnianą deskę — dźwięk **niższy** niż przy podskoku |
| `fx-bonk.mp3`         | kolizja — kij w dno blaszanego garnka od zewnątrz. **Jeden plik** na wszystkie przypadki: wróg, schodek od dołu przy jeździe windą, spód zjeżdżającej windy, uderzenie głową w schodek podczas podskoku |
| `fx-lever.mp3`        | przestawienie dźwigni (obie strony ten sam dźwięk)           |
| `fx-stair-slide.mp3`  | wyjeżdżanie / chowanie schodka od dźwigni **oraz** zapadni — **dwie płyty betonowe ocierające się o siebie**: suchy, szeroko­pasmowy zgrzyt bez wysokości dźwięku, nieregularny (zacinający się). Silnik zapętla i ucina do czasu ruchu (~0,7 s dźwignia, 1 s zapadnia); panorama + tłumienie odległościowe z pozycji schodka |
| `fx-ball-bounce.mp3`   | odbijana metalowa kula — wróg typu **bounce**; jeden krótki odbój, silnik powtarza go w rytmie fizyki piłki |
| `amb-patrol.mp3`       | **PĘTLA** — brzęczenie lampy próżniowej / idle miecza świetlnego (wróg **patrol**); głośność i panorama sterowane odległością od gracza |
| `amb-elevator.mp3`     | **PĘTLA** — bardzo subtelny szmer silnika elektrycznego (winda); głośność rośnie z prędkością jazdy, gdy stoi — cisza |
| `fx-coin.mp3`         | zebranie diamentu                                            |

### Zasięg słuchu (dźwięki otoczenia i odbicia kuli)

| Oś | Próg |
| --- | --- |
| X (pola / schodki) | dalej niż **6,5** — niesłyszalne |
| Y (w górę / w dół) | dalej niż **5,5** — niesłyszalne |

Tłumienie jest eliptyczne i łagodne (`(1 - d)²`), więc dźwięk dobiega stopniowo, a nie
włącza się skokiem. Wszystkie dźwięki otoczenia są rozdzielane na **lewo/prawo**
względem gracza (panorama liczona w układzie kamery).
| `fx-checkpoint.mp3`   | punkt kontrolny, przejście przez drzwi                       |
| `fx-game-over.mp3`    | upadek do wody / koniec gry                                  |
| `fx-win.mp3`          | fanfara zwycięstwa                                           |

## Melodie (pętle)

| Plik              | Gdzie gra                        |
| ----------------- | -------------------------------- |
| `music-menu.mp3`  | menu i wybór poziomu (spokojna)  |
| `music-game.mp3`  | rozgrywka (energiczna chiptune)  |

## Wskazówki produkcyjne

- **Loudness:** ok. −14 LUFS integrowanej głośności; efekty nie powinny przecinać
  −1 dBTP (master ma kompresor, ale nie limiter true-peak).
- **`fx-land.mp3`** najlepiej nagrać jako pojedyncze uderzenie 150–350 ms, z wyraźnym
  niskim „będę” (80–200 Hz) i krótkim drewnianym transjentem. Silnik odtwarza go z
  zmiennym `playbackRate` (1.12 przy małym upadku → ok. 0.9 przy dużym zeskoku),
  więc plik powinien brzmieć dobrze i przyśpieszony, i zwolniony.
- **Melodie** ciąć pod pętlę (bez ciszy na początku/końcu) — loader ustawia
  `loopStart = 0`, `loopEnd = duration`, `loop = true`, żeby pętla była bezszwowa.
- Format: MPEG-1 Audio Layer III, 44.1 kHz, mono dla FX (mniejszy plik), stereo dla melodii.
- Po wgraniu plików uruchom `await soundEngine.preload()` (App.tsx już to wywołuje
  po pierwszej interakcji — wymóg polityki autoplay przeglądarek).
