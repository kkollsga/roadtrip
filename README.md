# Endless Drive 🚗

A relaxing, ambient side-scrolling driving scene rendered on a plain HTML
canvas. A lone car rolls along a desolate road while biomes, weather, and a
full day/night cycle drift slowly by. It is designed to live in a background
tab or on a second monitor — something gentle to glance at while you work or
listen to music. No goals, no score, no noise.

Everything runs from a single page in plain JavaScript: no modules, no build
step, no frameworks, no external fonts or CDNs. It works straight off the disk.

## Running it

Just open `index.html` in any modern browser — double-click it, or drag it
into a window. That's it.

If your browser is strict about `file://` access, serve the folder over a tiny
local web server instead:

```sh
python3 -m http.server
```

Then visit <http://localhost:8000>.

## Controls

Move the mouse and a small round `☰` button fades in at the top-right corner.
Click it to open a compact settings panel; click outside, press `Esc`, or click
`☰` again to close it. Leave the mouse still for a few seconds and the button
(and the cursor) fade away, leaving just the scene.

| Action            | How                                              |
| ----------------- | ------------------------------------------------ |
| Open settings     | Move the mouse, click `☰` top-right               |
| Change car        | `‹ ›` arrows in the panel, or press `c`           |
| Weather           | Weather dropdown (Auto picks naturally)           |
| Speed             | Speed slider, or `↑` / `↓` (0 = parked)           |
| Day length        | "Day" number field (minutes per full cycle)       |
| Pause / play      | `⏸` / `▶` button, or `Space`                       |
| Fullscreen        | `⛶` button, or `f`                                 |
| Hide / show UI    | Press `h` (keeps it hidden until pressed again)   |

Keyboard shortcuts are ignored while you are typing in an input or dropdown.

There is deliberately no biome picker. The road wanders through plains,
forests, deserts, mountains, coastlines, tundra, Norwegian fjords, Brazilian
shores, groves of giant redwoods, and Japan in cherry-blossom season — pink
sakura, torii gates, teahouses, pagodas, and Mt Fuji — on its own — each region lasts half an
hour or more, blending into the next over about five minutes. Within a region
the scenery keeps shifting too: a lake opens up beside the plains, the fjord
turns inland through a fishing village, the beach gives way to deep jungle.
The roadside furniture drifts as well: stretches of power lines give way to
bare shoulders, planted avenues, or street lamps that glow after dark. Where you join the road
depends on the date and time of day, so refreshing the page drops you back on
the same stretch rather than revealing something new. Discovery happens by
driving.

## The session timer

If you want the drive to track a block of focused work, set a length in the
**Session** field and press **Start**. The scene maps your whole session onto a
single day of driving: it begins at dawn and advances steadily through midday
toward sunset, with the stars coming out right as your time runs low. A small,
faint countdown sits in the top-left corner the whole time.

When the session ends, a quiet "✦ session complete ✦" message fades in and out
— no sound — and the sky keeps deepening into night afterward. Your car
settings, speed, weather, and timer lengths are remembered between visits.

## URL parameters

Append these to the page URL to pin the scene to a particular look — handy for
wallpapers, screenshots, or a fixed mood:

| Parameter      | Effect                                               |
| -------------- | ---------------------------------------------------- |
| `?t=0..1`      | Lock the time of day (0 = deep night, 0.35 = midday) |
| `?weather=type`| Lock the weather to a named type                     |
| `?car=0-3`     | Start with a specific car                            |
| `?speed=0-2`   | Set the scroll speed (0 = parked)                    |
| `?ui=0`        | Hide the UI entirely (clean screenshots)             |

Along the way, keep an eye out for famous silhouettes on the horizon: Mount
Fuji, the Matterhorn, Everest, Denali, Kilimanjaro, Uluru, Monument Valley,
a Namib dune, a Hawaiian island, Half Dome, Devils Tower, the hoodoos of
Bryce Canyon, Old Faithful erupting on schedule, Sugarloaf rising from its
bay, glaciers spilling between fjord walls — and two volcanoes, Etna and
Eyjafjallajökull, which occasionally erupt.

Combine them with `&`, e.g. `index.html?t=0.75&weather=clear&ui=0`.

## Deploying to GitHub Pages

Because there is no build step, hosting is trivial:

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder, then **Save**.

GitHub serves the page at `https://<user>.github.io/<repo>/` within a minute or
two.

---

Built with Claude Code
