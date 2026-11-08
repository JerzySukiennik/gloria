# Gloria

A Mass that turns into a hardcore rave. You walk into a church built around a real chapel rebuilt in 3D from phone photos: a main hall three times as wide with two such chapels on its sides. You pick the song (hover to preview), sit down in any free pew (or don't), and the rest happens on its own: the priest greets the parish, the track drops, the concrete lattice wall turns into a giant LED screen, lasers fan out from the stage, flame jets and spark fountains fire on the drops, two huge censers swing on ropes over the crowd, the mirror ball spins and the priest breakdances in front of the altar. In the quiet part of the song the slots of the wall form a glowing cross.

Open `index.html` through any static server (ES modules from a CDN, no build step).

## Live lyrics

The `Aa` button (or `T`) shows the words of the song floating in the hall: each word appears the moment it is sung, and the sentence clears when it ends. The game ships only a timing map (`assets/lyrics-*.json`: which word of which line, and when). The text itself is fetched at play time from [LRCLIB](https://lrclib.net), so no lyrics are stored in this repository. The timing comes from our own audio: vocals separated with Demucs, word times from Whisper large-v3, then aligned to the LRCLIB line and word order (`Niepotrzebne/lyrics/align.py`).

## Controls

- Desktop: `W A S D` or arrows to walk, mouse to look (click to lock the pointer), `E` to sit down or stand up, `Space` to jump, `Shift` to walk faster, `T` to show or hide the lyrics.
- Phone: left thumb on the stick walks, drag anywhere else to look, buttons for sitting and jumping.

## How it works

- `js/church.js` builds the chapel from `js/layout.js`: brick wall with the arch to the main nave, the curved lattice of precast concrete slot panels with milky glass, the oval dome with its ring of windows, the brick retable with the real icons cropped from the photos, oak pews.
- `js/lattice.js` makes every glass slot addressable in a shader, so the wall can show daylight, an equalizer, chases, ripples and the cross.
- Light: a low sun casts real shadows through the slots onto the brick, rect area lights stand in for the glass, the environment map is captured from the chapel itself.
- `js/main.js` directs the Mass. The light show, the pyro, the crowd and the priest follow a beat grid of each song (`assets/song-*.json`, analysed with librosa: beats, energy per beat, bar types, breakdown, preview window).
- `js/rave.js` is the rig: lasers, moving heads, flame jets, spark fountains, CO2, swinging botafumeiro censers, mirror ball.
- `js/player.js` is the first-person walker with a collision grid of the room and seat finding.
- `plan.html` is the numbered floor plan of how the room was read from the photos.

## Credits

- Music (not licensed with this repository; rights are handled by the project owner): Era, "Ameno" (Gabry Ponte Techno Mix); Era, "Ameno" (Planet 6 Remix); Killer Mike, "YES!".
- Priest and congregation voices: generated with Google Gemini TTS (`gemini-2.5-flash-preview-tts`).
- Textures: ambientCG, CC0 (Bricks086, Plaster003, Concrete034, Wood092, Terrazzo019M).
- Icons, mosaic, plaques and paintings: cropped from the owner's photos of the chapel.
- Sounds from freesound.org, all CC0:
  - `organq60`: [Organ - quiet - C4](https://freesound.org/s/373735/) by sgossner
  - `organq63`: [Organ - quiet - D#4](https://freesound.org/s/373736/) by sgossner
  - `bell`: [Church bell half hour mark](https://freesound.org/s/852491/) by Sadiquecat
  - `sanctus`: [Small Bell #2](https://freesound.org/s/452379/) by steffcaffrey
  - `cheer`: [cheering and clapping crowd 2](https://freesound.org/s/221567/) by AlaskaRobotics
  - `applause`: [Clapping Large Crowd at Choir Concert 18](https://freesound.org/s/735578/) by pluralz
  - `chatter`: [Church Indistinct Chatter](https://freesound.org/s/661732/) by Dokuta_Gerovv
  - `room`: [ambience from church](https://freesound.org/s/523828/) by lartti
  - `ir`: [IR Church Small 5m Stereo](https://freesound.org/s/585739/) by Nox_Sound
- three.js r170 (MIT).
