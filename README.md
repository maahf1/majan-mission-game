# Majan Mission | مهمة مجان

3D browser game for NASA Space Apps 2026, Challenge 13 (Space Mission Design Game). Team Majan Mission, Ibra.

## Play online

- **The game (first-person Space Center):** https://maahf1.github.io/majan-mission-game/center.html
- Quick design mode: https://maahf1.github.io/majan-mission-game/index.html

It opens in a web browser on a laptop or a phone, in Arabic or English, with no login and nothing to install. On a phone, turn it sideways: the stick on the left walks, dragging on the screen looks around, and the USE button is on the right.

## Run the game on your own computer

```bash
node game/serve.js
```

Open http://localhost:8080 (or set `PORT`, e.g. `PORT=8090`). In this project it is also saved as **majan-game** in `.claude/launch.json` (port 8090).

For demos, add `?launch=ok` to always succeed at launch, or `?launch=fail` to show a failure.

## Built on NASA's challenge resources

Every resource NASA published for this challenge shows up in the game. The same list is in the game itself (menu, "NASA's resources in this game").

| NASA resource | Where it is in the game |
| --- | --- |
| Design and Develop Science Missions | The four segments (launch, space, ground, user) in the design review; requirements, then verification |
| Concept Maturity Levels (JPL) | The design-maturity ladder 1-4 on the design screen, with bonus points for a mature design |
| Mission Design Lab (NASA Goddard) | The trade study chart, the point design with its equipment list, cost and risk, and the end-of-mission plan |
| General Mission Analysis Tool (GMAT) | The same orbit quantities, shown simply: height, period, sunlight and shadow per orbit |
| NASA Mission Viz | The 3D orbit view with a timeline of mission phases and events |
| A Learning Game About Telescopes | The science goal decides the instruments: spectrum strip, fit label, similar NASA mission in the report |
| CubeSat 101 | The test campaign before launch, the 25-year rule for leaving orbit, commissioning after launch |
| Visualize a Space Mission Using Virtual Reality | Concept, trajectory, timeline and 3D in one flow, plus the first-person Space Center |

## How the game works

1. **Players** – solo, or a team of 2–4 sharing one budget. Each player gets a role: mission planner (orbit, end of mission, rocket), spacecraft engineer (power, tests), science lead (instruments), communications lead (antenna, ground stations). In a team, each role chooses on its turn, then the team reviews together and launches.
2. **Missions** – 3 missions unlock with stars: Aflaj Watch (easy, 3 years), Khareef Watch (medium, 2 years), Dune Hunter (hard, 5 years).
3. **Learning check** – 5 questions before the first mission and again after playing, to show what players learned. Results stay on the device; **Export CSV** on the menu saves them.
4. **Design** – 5 tabs:
   - **Orbit**: low (400 km), sun-synchronous (700 km) or high (1,200 km). It changes sunlight, sharpness, signal, lifetime and how much the rocket can carry. Under it, **End of mission**: nothing, a drag sail or a thruster. A dead satellite must leave orbit within 25 years, or the mission cannot launch. A thruster also keeps a low orbit up three times longer.
   - **Instruments**: 2 bays, from 6 types modelled on real ones (CubeSat camera, Landsat OLI-2, Landsat TIRS-2, MODIS, EMIT, NISAR radar). Each shows how well it fits the mission and which part of the spectrum it sees. Normal cameras only see in daylight; thermal and radar also work at night.
   - **Build**: 4 options of panels and batteries, and the **test campaign** (none, vibration, full). Less testing means a higher chance of an early fault in orbit.
   - **Comms**: 3 antennas, and the **ground stations** (Oman, plus a polar station, or a global network). A polar station only helps polar orbits; a second station also covers for Oman's when it is busy.
   - **Rocket**: small, medium or heavy, launched from Etlaq Spaceport, Duqm.
   Six meters show budget, power, mass vs rocket capacity, data, instrument fit and lifetime, with a star forecast. The forecast assumes the safe choice at every event, so a 3-star forecast keeps 3 stars when the team plays it safe; risky choices can win back hours or cost more. **Engineer view** shows the formulas and sources.
   - **Design maturity** (top of the parts panel) climbs from 1 to 4: idea, feasible, trade space (3 workable designs with a different orbit or instruments were compared), point design (all six requirements met). Launching with a mature design earns bonus points.
   - **Design review** opens four pages: the requirements with a tick or cross each, the **trade study** chart (every possible design as a dot: cost against science, with yours and the best-value line), the equipment list (mass, power, cost per part) and the four mission segments.
5. **Launch** – an establishing shot of Etlaq on the Duqm coast, then countdown and liftoff. The closer the satellite is to the rocket's limit, the riskier the launch.
6. **Operate** – a holographic Earth with a day side and a night side, and a **mission timeline** at the bottom (commissioning, operations, end of mission, with a marker for each event). The satellite runs on its battery in Earth's shadow, and normal cameras wait for daylight. Event cards with real stories: an early fault (a solar wing that did not open), solar storm, units check, busy ground station, space debris (in a team, each card names the role that decides).
7. **Results** – stars, score, XP and rank, badges, one line for every cause and decision, what happens to the satellite at the end of its life, the design-maturity bonus, the most similar real NASA mission, who uses the data, a team report per role, and two real NASA satellite images of the mission area. The score can be saved under a player or team name to the **leaderboard** on the device (menu).

Progress (stars, best scores, XP, badges, language, sound) is saved in the browser.

On phones (screens up to 860 px wide), the design screen shows one panel at a time: a bar switches between **Design** and **Status**, and always shows the forecast stars and the Launch button. The launch and orbit cameras widen on tall screens so the pad and the whole orbit fit.

## Files

| File | What it does |
| --- | --- |
| `js/main.js` | Screens, UI, team turns and game loop |
| `js/rules.js` | Orbits, instruments, power, comms, ground stations, end of mission, tests, rockets, missions, roles, `computeDesign`, requirements and maturity (all game numbers) |
| `js/missionsim.js` | Mission simulation and forecast (no 3D): commissioning, day and night, battery, data, events, lifetime |
| `js/review.js` | The design review: requirements, trade study chart, equipment list, four segments |
| `js/realmissions.js` | Twelve real missions (NASA, ISRO, JAXA, ESA, MBRSC) with rounded figures and sources; finds the ones closest to a design; the "Real missions" tab and the mass ladder |
| `js/report.js` | The printable mission report (A4, two pages): outcome, four segments, equipment list, requirements, events, real missions, NASA images |
| `js/board.js` | The leaderboard saved on the device |
| `js/satparts.js` | Shows a design on the satellite model (shared with the Space Center) |
| `js/quiz.js` | The 5-question learning check, saved results and CSV export |
| `js/nasa.js` | Real NASA satellite images for the report (NASA GIBS, with a local copy first), and `CLOUD_COVER`: the cloud cover measured in them by `tools/measure-clouds.mjs`. `rules.js` uses it (`cloudLoss`): cameras that look at the ground lose the cloudy share, radar does not |
| `js/hangar.js`, `js/launch.js`, `js/orbit.js` | The three 3D scenes (Muscat skyline, Etlaq · Duqm coast, Earth with day and night) |
| `js/fx.js` | Bloom, tone mapping, grain, vignette, chromatic aberration |
| `js/audio.js` | Sound effects made in code |
| `js/i18n.js`, `js/text2.js`, `js/text3.js`, `js/text4.js` | All Arabic and English text (the newer files override the older). `text4.js` holds real missions, the report, "How to play" and "About and sources" |
| `style.css`, `style3.css`, `style4.css` | Styles (`style3.css` holds the review, timeline, leaderboard and maturity ladder; `style4.css` the real missions tab, the guide and the report with its print layout) |
| `js/progress.js` | Saved progress |
| `js/data.js`, `js/sim.js` | The first version's rules, still used inside the Space Center (`center.html`) |
| `film.html`, `js/film.js` | The 20-second motion-graphics film |

### Checks

With the game server running on port 8090:

- `node tools/balance.mjs` tries every possible design for each mission and prints how many get 3 stars, the cheapest ones, and the best per orbit. Run it after changing any number in `rules.js`.
- `node tools/shot.mjs steps.json` plays the game in headless Chrome from a list of steps and saves screenshots to `video/shots/`. It prints page errors and failed requests.
- `node tools/report-pdf.mjs` plays one mission and saves its mission report as a PDF in English and Arabic (`submission/sample-mission-report-*.pdf`). It checks the print layout.

3D models are built in Blender by the scripts in `../models` (they export into `assets/`). The satellite (`models/make_satellite.py`) has crinkled gold insulation, a frame, radiators, hinged solar arrays with printed cells, and one named object per swappable part. Rebuild it with:

```bash
blender --background --factory-startup --python models/make_satellite.py
```

The first version of the model is kept in `backups/satellite-v1/`, the second (all built by script) in `backups/satellite-v2/`.

The satellite in the game is now version 3 (`models/make_satellite_v3.py`): the body and the solar array are NASA's own 3D model of Landsat 8 from NASA 3D Resources (`models/nasa/landsat8/`, free and without copyright), stood upright with the telescope pointing down, with the game's materials. The parts the player adds (instruments, battery, antennas) are still built by `make_satellite.py`. The model marks its two instrument bays with empty nodes `Bay_inst1` and `Bay_inst2`, which `js/satparts.js` reads.

```bash
blender --background --factory-startup --python models/make_satellite_v3.py
```

## Re-render the film

With the game server running on port 8090:

```bash
node tools/render-film.mjs
```

Writes `video/majan-mission-film.mp4` (1920×1080, 60 fps). Add `--probe` to time a few frames and save stills first. Preview it live at http://localhost:8090/film.html, or freeze one frame with `?t=12.5`.

## Videos and submission

With the game server running on port 8090:

```bash
node tools/capture.mjs classic
```

```bash
node tools/capture.mjs center
```

```bash
node tools/make-videos.mjs demo
```

```bash
node tools/make-videos.mjs walkthrough
```

`capture.mjs` records real gameplay at 1920×1080 into `video/clips/`. `make-videos.mjs` cuts the clips, adds captions and a synthesized soundtrack, and writes:

- `video/majan-demo-30s.mp4`: the official demo, under 30 seconds (the Space Apps limit), English captions. The tool refuses to write a demo longer than 29.9 seconds.
- `video/majan-walkthrough.mp4`: the whole game in about two minutes, English and Arabic captions.

Both carry a visible note, and file metadata, saying the code and the edit were made with AI assistance, as the Space Apps rules ask.

`../submission/` holds the text for the project page (English), the pitch and expected questions (Arabic), and two sample mission reports.

## Before the event

The game runs with **no internet**. Everything it used to load online is saved in the project:

| Saved copy | What it is | From |
| --- | --- | --- |
| `vendor/three/` | three.js 0.160.0 (`build/` and `examples/jsm/`) | registry.npmjs.org |
| `vendor/fonts/` | Space Grotesk, IBM Plex Sans Arabic, JetBrains Mono, with `fonts.css` | Google Fonts |
| `assets/earth_specular_2048.jpg` | NASA land and ocean map used for the globe's dots | three.js examples |
| `assets/nasa/` | The 6 NASA satellite images in the report | NASA GIBS (Worldview) |

`node tools/fetch-offline.mjs` downloads them again (about 10 MB). The report still falls back to NASA GIBS online if an image file is missing.

To prove it works offline: `node tools/shot.mjs steps.json --offline` refuses every request that leaves the computer and prints any it blocked.

Part numbers are rounded from the sources in Engineer view; check them against the official challenge resources when they are published.

## Majan Space Center (first-person simulator)

**This is the main game** (`center.html`); the classic screen (`index.html`) is the quick design mode, with a button into the center on its menu.

What the first-person version adds on top of the shared rules:

- **Team play**: the "Players" button (1 to 4) shares the four roles of `rules.js` (`ROLES`, `rolesFor`). The office computer and Mission Control say whose decision each part is, the mission console gets `team=N`, an event names the role in charge and the results show the team report. Check: `node tools/check-team-cloud.mjs` (also checks the cloud rule).
- **Phones** (`center-phone.css`, `style-phone.css`): on a touch device the body gets the class `touch`. A stick on the left (push it all the way to run), drag to look, a USE button that lights up when there is something to use, a DROP button while carrying a box, and a short tap on the picture also uses. The top bar keeps money and stars and folds the rest into a menu; the objectives show the current step and open on a tap; cards fit a phone held sideways; the game asks for full screen and landscape where the browser allows it. The picture pipeline is lighter (no 4x anti-aliasing, no glow pass on low graphics). The mission console hides its own header (`body.embed`) and lays out the orbit screen for short screens. Check: `node tools/shot.mjs steps.json --touch --size 844x390`. Not yet tried on a real phone.
- **A link for phones** (`tools/share-link.mjs`): a temporary public link through an SSH tunnel (localhost.run), or `--lan` for the same Wi-Fi, or `--url` for a permanent address (the published copy is on GitHub Pages; `tools/publish-github.ps1` uploads a new version); writes `submission/play-link.txt`, `qr-play.png`, `qr-play.svg` and `scan-to-play.html`. `node tools/check-paths.mjs` checks the letter case of every file reference before publishing on a web host.
- **Omani identity**: a crenellated roof line, a sadu rug and a coffee set with a dallah in the office, date palms, the flag (`js/center/polish.js`).
- **Duqm Space Settlement** (`js/center/settlement.js`): an analog habitat north-east of the building, seen from the clean room window: a central dome, four arms, eight pods, an airlock, two rovers. Our own model, inspired by the Space Settlement Centre being built in Duqm; not the official design. The player's stars add four modules (`SETTLEMENT_STAGES`: greenhouse at 2, solar field at 4, research building at 6, landing pad at 9), each with its own colliders. The notice board at the entrance (E) opens a panel on the real project and Oman's space plans, with sources. `node tools/view-center.mjs air:30,-6,-41,-28,15 --stars 9 --clean` shows it complete from the air.
- **Finishing touches** (`js/center/polish.js`): date palms that sway (instanced, built in code), a pavement with planters along the facade, keep-clear hatching at the loading door; inside the office, the six NASA images framed with captions and dates, and a rug.
- **Outside** (`js/center/outside.js`): sky with sun and clouds, dunes with a flat middle, a mountain ridge, the sea and its beach, the building's facade and roof, the ground station (its two small dishes light up with the ground-segment plan), and the Etlaq launch site (lightning masts, tank farm, integration hangar, floodlights, fence, gate, roads). All made in code. `groundHeight(x, z)` and `FLAT` say where the ground is level; walkers are kept inside `FLAT`.
- **The eight decisions** of the challenge (objectives, instruments, launch vehicle, budget, power, mass, communications, orbit) as a row of status lights in Mission Control and on the wall screen (`eightStatus` in `js/center/main.js`).
- **Design review at Mission Control**: the same review as the classic screen (requirements, trade study, equipment list, four segments, real missions).
- **Liftoff film**: three outside shots (the pad during the countdown, a low shot at ignition, a long lens on the climb). Its flames, light and smoke are made at load time and drawn once unseen (`liftoffKit`, `warmUpLiftoff`): adding a light later makes every material rebuild its shader, which froze the film for more than a second.
- **Mission console**: after liftoff the orbit phase runs in a frame inside the center (`index.html?center=1&embed=1&...`), so the player never leaves the page. When the player presses "Back to the Space Center" the frame posts `majan-mission-done`, the center reloads the saved progress (`profile.reload()`), pays the contract and shows the continue card.

Tools for it: `node tools/view-center.mjs name:x,z,yawDeg[,pitchDeg] ... --clean` (screenshots from any spot), `node tools/capture.mjs fp` (records the whole first-person game as clips `fp-*`), and `node tools/playtest-center.mjs` (plays it and checks every step, including the console).

Open http://localhost:8090/center.html (with the game server running).

You run Oman's space center in first person. It uses the same rules as the main game (`rules.js`), so the forecast in the center matches the mission you then play.

1. **Office** – the computer has four tabs:
   - **Contracts**: accept a mission. Each has a budget cap, a lifetime the satellite must reach, and a reward by stars. If cash runs low, the agency board approves one support grant (+25 M) per contract.
   - **Parts shop**: 5 instruments (with a "suits this contract" label), 3 power options and 2 antennas.
   - **Stock**: what is installed and in the building; spare boxes sell back for half price.
   - **Mission log**: every launch, with its stars, reward and design.
   A wall screen shows real NASA satellite images of the contract's area.
2. **Warehouse** – the truck brings the boxes to the delivery zone. Carry them, or stock them on the shelves (27 slots). Box labels are printed in English and Arabic.
3. **Clean room** – the satellite starts with a basic camera, small panels and a whip antenna, on an integration stand. Carry a box to it and press E:
   - Instruments go in the empty bay (A or B); if both are full, the new one replaces the one that suits the contract least, and the old one comes back as a box.
   - With empty hands, E takes the bay B instrument out.
   The wall screen shows the readiness meters (budget, power, mass vs rocket, data, fit, lifetime), the forecast and the plan.
4. **Launch control** – E opens **Mission Control**: choose the orbit, how the satellite leaves orbit at the end, the rocket (the chosen one stands on the pad outside), the ground stations and the test campaign; check the forecast and the advice, then launch. You watch the liftoff through the window, then the launch and orbit play in the main game with the same design, and "Back to the Space Center" pays the reward.

Controls: WASD to move, mouse to look, Shift to run, E or click to use / pick up, Q to put a box down, Esc to pause. Phones get a joystick and buttons.

Cash, contract, satellite, plan, mission log and every box position are saved in the browser. A save from the first version is converted once.

**Tutorial** (start screen, or the "? Tutorial" button): 10 guided steps with a glowing beacon that shows where to go — walk, computer, contract, shop, delivery, carrying, installing, the readiness screen, Mission Control and launch, and how to finish the game (3 stars on all three missions = 9 stars). It continues after the launch scene.

**Restart mission** (start/pause screen, or the top bar): starts the center again with 50 M cash and no contract, boxes or parts. Stars and unlocked missions are kept.

**Graphics: High / Low** (top bar): High has sun and spotlight shadows, soft ceiling area lights and reflections captured from the building. Low turns shadows off and lowers the resolution for weak laptops; phones start on Low. Outside: a desert sky, the Etlaq pad with its sign, and the Arabian Sea on the horizon.

| File | What it does |
| --- | --- |
| `center.html`, `center.css` | Page and HUD |
| `js/center/world.js` | The building, zones, shelves, stand, console, window view |
| `js/center/player.js` | First-person movement, collisions, touch controls |
| `js/center/textures.js` | Floors, walls, box labels and signs drawn in code |
| `js/center/main.js` | Contracts, shop, stock, mission log, grant, delivery truck, carrying, installing, Mission Control, liftoff, launch handoff, restart, graphics quality |
| `js/satparts.js` | Shows a design on the satellite model (shared with the main game's hangar) |
| `js/center/tutorial.js` | The guided tutorial card and the beacon |

The delivery truck and furniture (forklift, desks with monitor arms and live-looking screens, task chairs, sofa, coffee table, plants, filing cabinets, server racks, workbenches, robot arm, barrels, crates, pallets, water cooler, fire extinguishers, palms, cars) are built by `models/make_props.py` into `assets/props.glb`. The script's header says which way each prop faces; in `js/center/world.js` every chair sits on the screen side of its desk, and cabinets, racks and the water cooler face into the room. The first version of the props is kept in `backups/props-v1/`. When you order parts, the truck drives in along the road, reverses to the loading door with backup beeps, unloads the boxes one by one, then drives away.

### Automatic checks

With the game server running:

- `node tools/playtest-center.mjs` plays the whole game in a clean headless Chrome (tutorial, contract, shop, truck, selling, shelf, install, bay B take-out, Mission Control, launch, mission, return, mission log, grant, restart) and prints `NO PROBLEMS` or a list of failures. Options: `--lang en`, `--buy thermal,p2`, `--orbit sso`, `--rocket medium`, `--out shots/play`.
- `node tools/check-center.mjs` takes screenshots of every zone and prints the frame rate. Options: `--gfx low`, `--spots office,warehouse`, `--out shots`.

Neither touches the save in your own browser.
