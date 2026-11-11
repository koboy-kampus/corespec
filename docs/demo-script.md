# Demo script (5 minutes)

A walkthrough of CoreSpec for a supervisor, with the exact clicks. Each step has one line to say. Times are a guide; the whole run is about 5 minutes.

## Before the demo (5 minutes earlier)

- Use **Chrome on a laptop**, window maximised (the builder needs at least 1024 px wide for the side-by-side layout).
- Open the live site once and wait for the 3D case to appear on the landing page and in the builder. This warms the browser cache, so the demo doesn't wait on the 3D files.
- Start from a clean build: open `/builder`, click **New build** if the last one is still there.
- Have a **private window** ready to open (`Ctrl+Shift+N`) for the last step.
- Close other heavy tabs. The 3D view uses the graphics card.

## The run

| #   | Time | Do this (exact clicks)                                                                                                                                                                                                                                                      | Say this                                                                                                                                                    |
| --- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 0:00 | Open the landing page (`/`). Let the 3D case sway for a second, then scroll down to **"Start from a preset"**.                                                                                                                                                              | "CoreSpec is a PC builder for Indonesian buyers: it checks that parts fit together, draws them to scale in 3D and prices them in Rupiah."                   |
| 2   | 0:30 | Click the **1440p Sweet Spot** card. The builder opens with all 8 parts and **All checks passed**.                                                                                                                                                                          | "A preset is a balanced, checked build you can start from; the total uses real checked prices where I have them."                                           |
| 3   | 0:50 | In the slot list click **CPU** (AMD Ryzen 5 7600). In the picker, find **Intel Core i5-14400F**: its row already says _Incompatible: The CPU uses LGA1700, but the motherboard has an AM5 socket._ Click it.                                                                | "The checks run on every pick, even before you choose: an Intel CPU can't go in this AMD board."                                                            |
| 4   | 1:20 | Point at the red **Incompatible** status in the summary and the CPU glowing red in the 3D case. Click the error in the summary: the picker opens on the CPU. Pick **AMD Ryzen 5 7600** again.                                                                               | "Errors show in the list, the summary and the 3D view, and one click takes you to the fix."                                                                 |
| 5   | 1:45 | Click **Exploded view** (top right of the 3D view). Drag to rotate. Click **Assemble** to put it back.                                                                                                                                                                      | "Every part is placed from its real dimensions, so you can see what goes where."                                                                            |
| 6   | 2:10 | Click the **Setup** tab in the slot list, then **Add suggested setup**. The 3D view switches to the **Desk** view.                                                                                                                                                          | "The second half is the desk setup: monitor, keyboard, chair and the rest, with their own checks."                                                          |
| 7   | 2:35 | Click **Desk** and pick **IKEA MICKE 105×50**. Click **Speakers** and pick **Edifier S2000MKIII**. A warning appears: _The monitor and speakers need about 106.4 cm of desk, but this desk is 105 cm wide._ The speakers glow amber and the desk edge gets an amber line.   | "It knows the desk is too narrow for this monitor and these speakers, and shows exactly what hangs over."                                                   |
| 8   | 3:10 | Click **Monitor** and pick **LG UltraGear 27GR93U** (4K). A second warning: _This GPU is aimed at 1440p; a 4K monitor will need lower settings._                                                                                                                            | "Setup checks are warnings, not errors: the PC still works, but you'd want to know before buying a 4K monitor for this card."                               |
| 9   | 3:35 | In the summary, open **Where to buy**. Next to the Sapphire RX 9060 XT: **View on Tokopedia Rp 11.285.000** and **View on Shopee Rp 12.610.000**. Then click **CPU** in the PC tab: the Ryzen 5 7600 row is marked **Checked 11 Nov** with **View on Shopee**. Press `Esc`. | "Prices marked Checked are listings I checked by hand on Tokopedia and Shopee; the rest are estimates and say so. The site never scrapes the marketplaces." |
| 10  | 4:05 | Click **Share**, then **Copy link**. Open a private window (`Ctrl+Shift+N`) and paste the link.                                                                                                                                                                             | "No account needed: the whole build is in the link."                                                                                                        |
| 11  | 4:30 | In the private window: the build opens assembled, read-only, with the same checks, prices and shop links, and **Copy to my builds**.                                                                                                                                        | "Anyone can open it, see the same checks, and copy it to tweak it themselves. That's CoreSpec."                                                             |

Keep step 7's desk and speakers for the end: they're the easiest warnings to see in 3D.

## If the 3D view is slow to load

- **Nothing breaks without it.** The page first shows a technical drawing of the case, and every list, check, price and link works before (and without) the 3D view. Carry on talking and point at the summary; the 3D view fades in when it's ready.
- **Landing page:** the 3D case only loads once the page has settled. Scrolling down to the presets and back gives it time.
- **Still slow after ~10 seconds:** reload the page once. The second load comes from the cache (that's why to open everything before the demo).
- **3D view missing entirely** (old laptop, graphics drivers): the drawing stays. Say "on this machine the 3D view is turned off; here's what it looks like" and show `docs/screenshots/` (the builder, the exploded view, the setup tab and the desk view).
- **Camera in an odd spot after dragging:** click the 3D view and press **R** to reset it.

## If something else goes wrong

- **The build already has parts** from earlier testing: click **New build**, then load the preset from **Load preset → 1440p Sweet Spot**.
- **A step's item isn't in the picker:** type its name in the picker's search box (e.g. "MICKE", "S2000", "27GR93U").
- **A price looks off:** prices change; the "Checked" date says when it was looked at, and a check older than 14 days says "Price may have changed".
