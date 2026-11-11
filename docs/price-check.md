# Price check

CoreSpec shows two kinds of price: **Checked** (a marketplace listing you looked at by hand, with its date) and **Estimate** (`priceIDR` in the JSON, dated by `pricesAsOf` in `data/meta.json`). Where an item has checked listings, the lowest one is shown and added to totals. Never scrape a marketplace or fetch one from the app: these are prices you check yourself.

## Checking prices

1. Open `data/price-check.csv` in Excel or Google Sheets. It has one row per catalogue item: `id, name, marketplace, url, price, checked`.
2. For an item you checked, fill in:
   - `marketplace`: `tokopedia`, `shopee` or `blibli`;
   - `url`: the listing's full `https://` link, on that marketplace's own site;
   - `price`: whole rupiah, digits only (`2747000`, not `2.747.000` or `Rp 2,7jt`);
   - `checked`: the date you checked it, written `YYYY-MM-DD`.
     Use the lowest price from an official store or a well-rated seller; skip bundles, used items and "pre-order". Another listing for the same item goes on a new row with the same `id`. Rows you leave empty are fine.
3. Save it as CSV (comma or semicolon separated both work), then run:

   ```
   npm run prices:apply
   npm test
   ```

   `prices:apply` checks every row (known `id`, marketplace, `https` link on that marketplace, whole-number price, real date not in the future) and stops with a list of bad rows if anything is wrong, writing nothing. Otherwise it writes the listings into `data/parts/*.json` and `data/setup/*.json` and prints what changed.

4. Commit `data/price-check.csv` and the changed JSON files.

The CSV is the source of truth for listings: clearing a row removes that listing from the site the next time you run the script. A listing older than 14 days shows "Price may have changed" next to its price, so re-check those first.

To update an **estimate** instead, edit `priceIDR` in the JSON and the date in `data/meta.json`.

## Specs to double-check

While you're on a product page, glance at the specs too. These were the ones I couldn't confirm online when the items were added.

### PC parts added in Phase 13a

Everything else on these 9 parts matched the maker's page or at least two retailer spec sheets. These didn't:

- **ASRock B650M-HDV/M.2 — size.** 244 × 226 mm comes from one retailer listing; ASRock's spec page didn't load. (2 DDR5 slots and 2 M.2 slots are confirmed.)
- **Team T-Force Delta RGB — module size.** Height 46 mm is from retailers (no Team datasheet found). Length is the standard 133 mm DIMM; some listings say 144.2 mm.
- **Lexar NM790 2TB — thickness.** Not found; drawn 3 mm thick like the other M.2 drives.
- **DeepCool AK620 — LGA1851 support and height.** Listed for LGA1851 because it uses the LGA1700 mounting, which I couldn't confirm in DeepCool's own list. Height 160 mm per retailers; one review measured 162 mm.
- **Arctic Liquid Freezer III Pro 360 — pump height and LGA1851.** Radiator 398 × 120 × 38 mm is confirmed; the 53 mm pump height is copied from the Liquid Freezer III 240, and LGA1851 support wasn't checked.
- **Arc B580 — "1080p" class.** My call for the setup rules (reviews put it between 1080p and entry 1440p), not a spec.

### Setup items added in Phase 13a

**Confirmed online** (maker's page or two retailer spec sheets): desk sizes and height ranges for LINNMON/ADILS (74 cm), IDÅSEN 160×80 (62–127 cm) and the FlexiSpot E7 Pro frame (63.5–128.5 cm); both MSI monitors (size, resolution, refresh, panel, weight without stand); arm limits for the Loctek D7A and D7D (27", 9 kg per arm), AOC AM400B (17–34", 9 kg), Ergotron HX (42", 19.1 kg) and Kaloc DS110 (the 9 kg / 32" "Classic" version).

**Not confirmed — from memory, please check on the product page:**

- **Desks:** LAGKAPTEN / ALEX 140×60 height (73 cm); TROTTEN 160×80 range (copied from the 120×70: 72–122 cm); FlexiSpot E7 Pro sold with a 140×70 top in Indonesia, and its height with the top (frame + 25 mm).
- **Chairs:** all 5 sizes (width, depth, height) are approximate; FLINTAN and MILLBERGET prices at IKEA Indonesia.
- **Arms:** the AM400B's mount options (clamp and grommet), and the D7D's per-arm limit (US listings say 9 kg; one review says less).
- **Speakers:** all 5 sizes (one speaker, W × D × H); the S2000MKIII and A5+ are big enough to trigger the desk-width warning on narrow desks, which is intended.
- **Small items:** sizes and weights of the headsets, keyboards, mice, mousepads, webcams, microphones and lamps; the G POWERPLAY's pad size; the Razer Kiyo, Insta360 Link and Shure MV7+ sizes; switch names (K552 "Outemu Blue", G915 X "GL Tactile").
- **Light bars:** whether the Yeelight Screen Light Bar Pro and BenQ ScreenBar Pro are USB-powered (I listed both as USB).
- **Microphones:** the Fifine AM8 and Shure MV7+ have both USB and XLR; they're listed as USB because the data has one connection.
