# Price check

Every part used in the 3 presets, with the price CoreSpec shows today (`pricesAsOf` 2026-11-08). Fill in what Tokopedia and Shopee show and the date you checked, then update `priceIDR` in `data/parts/<category>.json` and `pricesAsOf` in `data/meta.json`.

Tips: search the exact model, use the lowest price from an official store or a well-rated seller, and ignore bundles and used listings. Parts shared by more than one preset are listed once.

| Type        | Part                                         | ID                                                | Used in                               | CoreSpec price | Tokopedia | Shopee | Checked |
| ----------- | -------------------------------------------- | ------------------------------------------------- | ------------------------------------- | -------------- | --------- | ------ | ------- |
| CPU         | AMD Ryzen 5 5600                             | `cpu-amd-ryzen-5-5600`                            | Budget 1080p                          | Rp 1.650.000   |           |        |         |
| CPU         | AMD Ryzen 5 7600                             | `cpu-amd-ryzen-5-7600`                            | 1440p Sweet Spot                      | Rp 2.900.000   |           |        |         |
| CPU         | AMD Ryzen 9 9950X                            | `cpu-amd-ryzen-9-9950x`                           | Creator Workstation                   | Rp 9.800.000   |           |        |         |
| Cooler      | Thermalright Assassin X 120 Refined SE       | `cooler-thermalright-assassin-x-120-refined-se`   | Budget 1080p                          | Rp 280.000     |           |        |         |
| Cooler      | Thermalright Peerless Assassin 120 SE        | `cooler-thermalright-peerless-assassin-120-se`    | 1440p Sweet Spot, Creator Workstation | Rp 520.000     |           |        |         |
| Motherboard | ASRock B550M-HDV                             | `motherboard-asrock-b550m-hdv`                    | Budget 1080p                          | Rp 1.200.000   |           |        |         |
| Motherboard | MSI B650M Gaming Plus WiFi                   | `motherboard-msi-b650m-gaming-plus-wifi`          | 1440p Sweet Spot                      | Rp 2.899.000   |           |        |         |
| Motherboard | Gigabyte B650 Aorus Elite AX                 | `motherboard-gigabyte-b650-aorus-elite-ax`        | Creator Workstation                   | Rp 3.700.000   |           |        |         |
| RAM         | Team T-Force Vulcan Z 16GB (2×8GB) DDR4-3200 | `ram-team-t-force-vulcan-z-16gb-2-8gb-ddr4-3200`  | Budget 1080p                          | Rp 750.000     |           |        |         |
| RAM         | Kingston Fury Beast 32GB (2×16GB) DDR5-6000  | `ram-kingston-fury-beast-32gb-2-16gb-ddr5-6000`   | 1440p Sweet Spot                      | Rp 2.349.000   |           |        |         |
| RAM         | Corsair Vengeance 64GB (2×32GB) DDR5-6000    | `ram-corsair-vengeance-64gb-2-32gb-ddr5-6000`     | Creator Workstation                   | Rp 4.600.000   |           |        |         |
| GPU         | Sapphire Pulse Radeon RX 6600 8GB            | `gpu-sapphire-pulse-radeon-rx-6600-8gb`           | Budget 1080p                          | Rp 3.100.000   |           |        |         |
| GPU         | Sapphire Pulse Radeon RX 9060 XT 16GB        | `gpu-sapphire-pulse-radeon-rx-9060-xt-16gb`       | 1440p Sweet Spot                      | Rp 6.300.000   |           |        |         |
| GPU         | Gigabyte GeForce RTX 5070 Windforce OC 12GB  | `gpu-gigabyte-geforce-rtx-5070-windforce-oc-12gb` | Creator Workstation                   | Rp 10.499.000  |           |        |         |
| Storage     | Crucial P3 Plus 500GB                        | `storage-crucial-p3-plus-500gb`                   | Budget 1080p                          | Rp 700.000     |           |        |         |
| Storage     | Crucial P3 Plus 1TB                          | `storage-crucial-p3-plus-1tb`                     | 1440p Sweet Spot                      | Rp 1.050.000   |           |        |         |
| Storage     | WD Black SN850X 2TB                          | `storage-wd-black-sn850x-2tb`                     | Creator Workstation                   | Rp 2.950.000   |           |        |         |
| PSU         | Cooler Master MWE 550 Bronze V2              | `psu-cooler-master-mwe-550-bronze-v2`             | Budget 1080p                          | Rp 750.000     |           |        |         |
| PSU         | MSI MAG A650BN                               | `psu-msi-mag-a650bn`                              | 1440p Sweet Spot                      | Rp 850.000     |           |        |         |
| PSU         | Corsair RM750e                               | `psu-corsair-rm750e`                              | Creator Workstation                   | Rp 1.599.000   |           |        |         |
| Case        | Cooler Master MasterBox Q300L                | `case-cooler-master-masterbox-q300l`              | Budget 1080p                          | Rp 650.000     |           |        |         |
| Case        | Montech AIR 100 ARGB                         | `case-montech-air-100-argb`                       | 1440p Sweet Spot                      | Rp 750.000     |           |        |         |
| Case        | Lian Li Lancool 216                          | `case-lian-li-lancool-216`                        | Creator Workstation                   | Rp 1.600.000   |           |        |         |

23 parts. Prices in the table are copied from the data on 2026-11-08; the JSON files are the source of truth.

## Setup items (Phase 10)

Every setup item in the catalogue, not only the ones in suggested setups. Update `priceIDR` in `data/setup/<category>.json`. While you're on the product page, also glance at the specs (size, refresh rate, adaptive sync, desk height range): they were written by hand and are approximate too.

| Type          | Item                                 | ID                                              | Suggested in        | CoreSpec price | Tokopedia | Shopee | Checked |
| ------------- | ------------------------------------ | ----------------------------------------------- | ------------------- | -------------- | --------- | ------ | ------- |
| Monitor       | AOC 24G4                             | `monitor-aoc-24g4`                              | Budget 1080p        | Rp 1.850.000   |           |        |         |
| Monitor       | Dell P2422H                          | `monitor-dell-p2422h`                           | —                   | Rp 2.900.000   |           |        |         |
| Monitor       | LG UltraGear 27GR75Q                 | `monitor-lg-ultragear-27gr75q`                  | 1440p Sweet Spot    | Rp 3.600.000   |           |        |         |
| Monitor       | Samsung Odyssey G5 27" C27G55T       | `monitor-samsung-odyssey-g5-27-c27g55t`         | —                   | Rp 3.900.000   |           |        |         |
| Monitor       | LG UltraGear 27GR93U                 | `monitor-lg-ultragear-27gr93u`                  | Creator Workstation | Rp 8.500.000   |           |        |         |
| Monitor       | LG UltraGear 27GS95QE                | `monitor-lg-ultragear-27gs95qe`                 | —                   | Rp 12.100.000  |           |        |         |
| Monitor       | Alienware AW3423DW                   | `monitor-alienware-aw3423dw`                    | —                   | Rp 16.500.000  |           |        |         |
| Monitor arm   | North Bayou F80                      | `arm-north-bayou-f80`                           | 1440p Sweet Spot    | Rp 300.000     |           |        |         |
| Monitor arm   | North Bayou F160 Dual                | `arm-north-bayou-f160-dual`                     | —                   | Rp 550.000     |           |        |         |
| Monitor arm   | Ergotron LX Desk Mount               | `arm-ergotron-lx-desk-mount`                    | Creator Workstation | Rp 3.500.000   |           |        |         |
| Monitor arm   | Ergotron LX Dual Side-by-Side        | `arm-ergotron-lx-dual-side-by-side`             | —                   | Rp 6.500.000   |           |        |         |
| Keyboard      | Logitech G213 Prodigy                | `keyboard-logitech-g213-prodigy`                | —                   | Rp 750.000     |           |        |         |
| Keyboard      | Royal Kludge RK84                    | `keyboard-royal-kludge-rk84`                    | Budget 1080p        | Rp 650.000     |           |        |         |
| Keyboard      | Keychron K2                          | `keyboard-keychron-k2`                          | 1440p Sweet Spot    | Rp 1.400.000   |           |        |         |
| Keyboard      | Keychron V2                          | `keyboard-keychron-v2`                          | Creator Workstation | Rp 1.300.000   |           |        |         |
| Keyboard      | Razer BlackWidow V4 X                | `keyboard-razer-blackwidow-v4-x`                | —                   | Rp 2.300.000   |           |        |         |
| Keyboard      | SteelSeries Apex Pro TKL (2023)      | `keyboard-steelseries-apex-pro-tkl-2023`        | —                   | Rp 3.800.000   |           |        |         |
| Mouse         | Logitech G102 Lightsync              | `mouse-logitech-g102-lightsync`                 | Budget 1080p        | Rp 250.000     |           |        |         |
| Mouse         | Razer DeathAdder Essential           | `mouse-razer-deathadder-essential`              | —                   | Rp 300.000     |           |        |         |
| Mouse         | Logitech G304 Lightspeed             | `mouse-logitech-g304-lightspeed`                | 1440p Sweet Spot    | Rp 450.000     |           |        |         |
| Mouse         | Logitech G502 X                      | `mouse-logitech-g502-x`                         | Creator Workstation | Rp 1.000.000   |           |        |         |
| Mouse         | Razer Viper V3 HyperSpeed            | `mouse-razer-viper-v3-hyperspeed`               | —                   | Rp 1.100.000   |           |        |         |
| Mouse         | Logitech G Pro X Superlight 2        | `mouse-logitech-g-pro-x-superlight-2`           | —                   | Rp 2.300.000   |           |        |         |
| Mousepad      | SteelSeries QcK Medium               | `mousepad-steelseries-qck-medium`               | Budget 1080p        | Rp 180.000     |           |        |         |
| Mousepad      | Razer Gigantus V2 Large              | `mousepad-razer-gigantus-v2-large`              | 1440p Sweet Spot    | Rp 280.000     |           |        |         |
| Mousepad      | Logitech G840 XL                     | `mousepad-logitech-g840-xl`                     | Creator Workstation | Rp 650.000     |           |        |         |
| Mousepad      | Glorious 3XL Extended                | `mousepad-glorious-3xl-extended`                | —                   | Rp 750.000     |           |        |         |
| Headset       | HyperX Cloud Stinger 2               | `headset-hyperx-cloud-stinger-2`                | Budget 1080p        | Rp 550.000     |           |        |         |
| Headset       | SteelSeries Arctis Nova 1            | `headset-steelseries-arctis-nova-1`             | —                   | Rp 800.000     |           |        |         |
| Headset       | Logitech G435 Lightspeed             | `headset-logitech-g435-lightspeed`              | 1440p Sweet Spot    | Rp 900.000     |           |        |         |
| Headset       | HyperX Cloud II                      | `headset-hyperx-cloud-ii`                       | Creator Workstation | Rp 1.100.000   |           |        |         |
| Headset       | Soundcore Life Q30                   | `headset-soundcore-life-q30`                    | —                   | Rp 1.200.000   |           |        |         |
| Headset       | Razer BlackShark V2 Pro (2023)       | `headset-razer-blackshark-v2-pro-2023`          | —                   | Rp 2.700.000   |           |        |         |
| Speakers      | Logitech Z120                        | `speakers-logitech-z120`                        | Budget 1080p        | Rp 150.000     |           |        |         |
| Speakers      | Creative Pebble Plus                 | `speakers-creative-pebble-plus`                 | 1440p Sweet Spot    | Rp 650.000     |           |        |         |
| Speakers      | Logitech Z333                        | `speakers-logitech-z333`                        | —                   | Rp 900.000     |           |        |         |
| Speakers      | Edifier R1080BT                      | `speakers-edifier-r1080bt`                      | Creator Workstation | Rp 1.200.000   |           |        |         |
| Webcam        | Logitech C270 HD                     | `webcam-logitech-c270-hd`                       | —                   | Rp 250.000     |           |        |         |
| Webcam        | Logitech C920 HD Pro                 | `webcam-logitech-c920-hd-pro`                   | 1440p Sweet Spot    | Rp 900.000     |           |        |         |
| Webcam        | Elgato Facecam                       | `webcam-elgato-facecam`                         | —                   | Rp 2.300.000   |           |        |         |
| Webcam        | Logitech Brio 4K                     | `webcam-logitech-brio-4k`                       | Creator Workstation | Rp 2.700.000   |           |        |         |
| Microphone    | Fifine K669B                         | `microphone-fifine-k669b`                       | 1440p Sweet Spot    | Rp 300.000     |           |        |         |
| Microphone    | Rode PodMic                          | `microphone-rode-podmic`                        | Creator Workstation | Rp 1.600.000   |           |        |         |
| Microphone    | HyperX QuadCast S                    | `microphone-hyperx-quadcast-s`                  | —                   | Rp 1.900.000   |           |        |         |
| Microphone    | Shure SM7B                           | `microphone-shure-sm7b`                         | —                   | Rp 6.500.000   |           |        |         |
| Desk lighting | Govee RGBIC LED Strip 5 m            | `lighting-govee-rgbic-led-strip-5-m`            | —                   | Rp 300.000     |           |        |         |
| Desk lighting | IKEA FORSÅ work lamp                 | `lighting-ikea-forsa-work-lamp`                 | —                   | Rp 400.000     |           |        |         |
| Desk lighting | Xiaomi Mi Computer Monitor Light Bar | `lighting-xiaomi-mi-computer-monitor-light-bar` | 1440p Sweet Spot    | Rp 450.000     |           |        |         |
| Desk lighting | BenQ ScreenBar Halo                  | `lighting-benq-screenbar-halo`                  | Creator Workstation | Rp 2.500.000   |           |        |         |
| Desk          | IKEA MICKE 105×50                    | `desk-ikea-micke-105-50`                        | —                   | Rp 1.300.000   |           |        |         |
| Desk          | IKEA LAGKAPTEN / ADILS 120×60        | `desk-ikea-lagkapten-adils-120-60`              | Budget 1080p        | Rp 900.000     |           |        |         |
| Desk          | IKEA TROTTEN sit/stand 120×70        | `desk-ikea-trotten-sit-stand-120-70`            | 1440p Sweet Spot    | Rp 3.500.000   |           |        |         |
| Desk          | IKEA MITTZON sit/stand 140×80        | `desk-ikea-mittzon-sit-stand-140-80`            | Creator Workstation | Rp 6.000.000   |           |        |         |
| Chair         | IKEA MARKUS                          | `chair-ikea-markus`                             | Creator Workstation | Rp 2.500.000   |           |        |         |
| Chair         | Cougar Armor One                     | `chair-cougar-armor-one`                        | 1440p Sweet Spot    | Rp 2.600.000   |           |        |         |
| Chair         | DXRacer Formula Series               | `chair-dxracer-formula-series`                  | —                   | Rp 4.200.000   |           |        |         |
| Chair         | Herman Miller Aeron                  | `chair-herman-miller-aeron`                     | —                   | Rp 25.000.000  |           |        |         |

57 setup items. Prices copied from the data on 2026-11-11.

## New in Phase 13a: PC parts (batch 1)

Added so every PC category has at least 3 Budget, 3 Mid and 3 High-end parts. Prices are estimates from 2026-11-11; nothing here was checked on a marketplace yet.

| Type        | Part                                      | ID                                                 | Tier     | CoreSpec price | Tokopedia | Shopee | Checked |
| ----------- | ----------------------------------------- | -------------------------------------------------- | -------- | -------------- | --------- | ------ | ------- |
| CPU         | Intel Core i3-14100F                      | `cpu-intel-core-i3-14100f`                         | Budget   | Rp 1.550.000   |           |        |         |
| Motherboard | ASRock B650M-HDV/M.2                      | `motherboard-asrock-b650m-hdv-m2`                  | Budget   | Rp 1.750.000   |           |        |         |
| RAM         | Team T-Force Delta RGB 32GB (2×16GB) 6000 | `ram-team-t-force-delta-rgb-32gb-2-16gb-ddr5-6000` | Mid      | Rp 2.450.000   |           |        |         |
| GPU         | ASRock Intel Arc B580 Challenger OC 12GB  | `gpu-asrock-intel-arc-b580-challenger-oc-12gb`     | Budget   | Rp 5.000.000   |           |        |         |
| Storage     | Lexar NM790 2TB                           | `storage-lexar-nm790-2tb`                          | Mid      | Rp 2.500.000   |           |        |         |
| PSU         | DeepCool PK650D                           | `psu-deepcool-pk650d`                              | Budget   | Rp 750.000     |           |        |         |
| Case        | DeepCool CC560 V2                         | `case-deepcool-cc560-v2`                           | Budget   | Rp 750.000     |           |        |         |
| Cooler      | DeepCool AK620                            | `cooler-deepcool-ak620`                            | Mid      | Rp 950.000     |           |        |         |
| Cooler      | Arctic Liquid Freezer III Pro 360         | `cooler-arctic-liquid-freezer-iii-pro-360`         | High-end | Rp 2.100.000   |           |        |         |

### Specs to double-check

Everything else on these 9 parts matched the maker's page or at least two retailer spec sheets. These didn't:

- **ASRock B650M-HDV/M.2 — size.** 244 × 226 mm comes from one retailer listing; ASRock's spec page didn't load. (2 DDR5 slots and 2 M.2 slots are confirmed.)
- **Team T-Force Delta RGB — module size.** Height 46 mm is from retailers (no Team datasheet found). Length is the standard 133 mm DIMM; some listings say 144.2 mm.
- **Lexar NM790 2TB — thickness.** Not found; drawn 3 mm thick like the other M.2 drives.
- **DeepCool AK620 — LGA1851 support and height.** Listed for LGA1851 because it uses the LGA1700 mounting, which I couldn't confirm in DeepCool's own list. Height 160 mm per retailers; one review measured 162 mm.
- **Arctic Liquid Freezer III Pro 360 — pump height and LGA1851.** Radiator 398 × 120 × 38 mm is confirmed; the 53 mm pump height is copied from the Liquid Freezer III 240, and LGA1851 support wasn't checked.
- **Arc B580 — "1080p" class.** My call for the setup rules (reviews put it between 1080p and entry 1440p), not a spec.

## New in Phase 13a: setup items (batch 2)

51 setup items, so every setup category has exactly 3 Budget, 3 Mid and 3 High-end items. Prices are estimates from 2026-11-11; nothing here was checked on a marketplace yet.

| Type          | Item                                 | ID                                             | Tier     | CoreSpec price | Tokopedia | Shopee | Checked |
| ------------- | ------------------------------------ | ---------------------------------------------- | -------- | -------------- | --------- | ------ | ------- |
| Monitor       | MSI G244F E2                         | `monitor-msi-g244f-e2`                         | Budget   | Rp 1.700.000   |           |        |         |
| Monitor       | MSI MAG 274QRF QD E2                 | `monitor-msi-mag-274qrf-qd-e2`                 | Mid      | Rp 4.200.000   |           |        |         |
| Monitor arm   | Kaloc DS110                          | `arm-kaloc-ds110`                              | Budget   | Rp 280.000     |           |        |         |
| Monitor arm   | AOC AM400B                           | `arm-aoc-am400b`                               | Mid      | Rp 1.000.000   |           |        |         |
| Monitor arm   | Loctek D7A                           | `arm-loctek-d7a`                               | Mid      | Rp 1.200.000   |           |        |         |
| Monitor arm   | Loctek D7D Dual                      | `arm-loctek-d7d-dual`                          | Mid      | Rp 2.000.000   |           |        |         |
| Monitor arm   | Ergotron HX Desk Mount               | `arm-ergotron-hx-desk-mount`                   | High-end | Rp 7.500.000   |           |        |         |
| Keyboard      | Redragon Kumara K552                 | `keyboard-redragon-kumara-k552`                | Budget   | Rp 450.000     |           |        |         |
| Keyboard      | Logitech G915 X TKL Lightspeed       | `keyboard-logitech-g915-x-tkl-lightspeed`      | High-end | Rp 3.500.000   |           |        |         |
| Keyboard      | Razer Huntsman V3 Pro TKL            | `keyboard-razer-huntsman-v3-pro-tkl`           | High-end | Rp 3.800.000   |           |        |         |
| Mouse         | Razer Basilisk V3                    | `mouse-razer-basilisk-v3`                      | Mid      | Rp 900.000     |           |        |         |
| Mouse         | Razer DeathAdder V3 Pro              | `mouse-razer-deathadder-v3-pro`                | High-end | Rp 2.400.000   |           |        |         |
| Mouse         | Logitech G502 X PLUS                 | `mouse-logitech-g502-x-plus`                   | High-end | Rp 2.500.000   |           |        |         |
| Mousepad      | Logitech G240                        | `mousepad-logitech-g240`                       | Budget   | Rp 200.000     |           |        |         |
| Mousepad      | SteelSeries QcK Heavy XXL            | `mousepad-steelseries-qck-heavy-xxl`           | Mid      | Rp 650.000     |           |        |         |
| Mousepad      | Artisan Hien FX XSoft L              | `mousepad-artisan-hien-fx-xsoft-l`             | High-end | Rp 1.300.000   |           |        |         |
| Mousepad      | Logitech G POWERPLAY                 | `mousepad-logitech-g-powerplay`                | High-end | Rp 2.000.000   |           |        |         |
| Mousepad      | Corsair MM700 RGB 3XL                | `mousepad-corsair-mm700-rgb-3xl`               | High-end | Rp 1.200.000   |           |        |         |
| Headset       | JBL Quantum 100                      | `headset-jbl-quantum-100`                      | Budget   | Rp 400.000     |           |        |         |
| Headset       | Logitech G PRO X 2 Lightspeed        | `headset-logitech-g-pro-x-2-lightspeed`        | High-end | Rp 4.000.000   |           |        |         |
| Headset       | SteelSeries Arctis Nova Pro Wireless | `headset-steelseries-arctis-nova-pro-wireless` | High-end | Rp 6.000.000   |           |        |         |
| Speakers      | Edifier R19U                         | `speakers-edifier-r19u`                        | Budget   | Rp 300.000     |           |        |         |
| Speakers      | Edifier MR4                          | `speakers-edifier-mr4`                         | Mid      | Rp 1.300.000   |           |        |         |
| Speakers      | Audioengine A2+ Wireless             | `speakers-audioengine-a2-plus-wireless`        | High-end | Rp 5.000.000   |           |        |         |
| Speakers      | Edifier S2000MKIII                   | `speakers-edifier-s2000mkiii`                  | High-end | Rp 8.500.000   |           |        |         |
| Speakers      | Audioengine A5+ Wireless             | `speakers-audioengine-a5-plus-wireless`        | High-end | Rp 9.000.000   |           |        |         |
| Webcam        | Logitech C310 HD                     | `webcam-logitech-c310-hd`                      | Budget   | Rp 400.000     |           |        |         |
| Webcam        | Logitech C505 HD                     | `webcam-logitech-c505-hd`                      | Budget   | Rp 500.000     |           |        |         |
| Webcam        | Logitech C922 Pro Stream             | `webcam-logitech-c922-pro-stream`              | Mid      | Rp 1.200.000   |           |        |         |
| Webcam        | Razer Kiyo                           | `webcam-razer-kiyo`                            | Mid      | Rp 1.300.000   |           |        |         |
| Webcam        | Insta360 Link                        | `webcam-insta360-link`                         | High-end | Rp 4.500.000   |           |        |         |
| Microphone    | Fifine AM8                           | `microphone-fifine-am8`                        | Budget   | Rp 700.000     |           |        |         |
| Microphone    | Maono AU-PM421                       | `microphone-maono-au-pm421`                    | Budget   | Rp 600.000     |           |        |         |
| Microphone    | RØDE NT-USB Mini                     | `microphone-rode-nt-usb-mini`                  | Mid      | Rp 1.500.000   |           |        |         |
| Microphone    | Shure MV7+                           | `microphone-shure-mv7-plus`                    | High-end | Rp 4.000.000   |           |        |         |
| Microphone    | Electro-Voice RE20                   | `microphone-electro-voice-re20`                | High-end | Rp 8.000.000   |           |        |         |
| Desk lighting | Xiaomi Mijia LED Desk Lamp 1S        | `lighting-xiaomi-mijia-led-desk-lamp-1s`       | Budget   | Rp 500.000     |           |        |         |
| Desk lighting | Yeelight LED Screen Light Bar Pro    | `lighting-yeelight-screen-light-bar-pro`       | Mid      | Rp 1.100.000   |           |        |         |
| Desk lighting | Philips Hue Lightstrip Plus 2 m      | `lighting-philips-hue-lightstrip-plus-2-m`     | Mid      | Rp 1.300.000   |           |        |         |
| Desk lighting | BenQ ScreenBar Pro                   | `lighting-benq-screenbar-pro`                  | High-end | Rp 2.300.000   |           |        |         |
| Desk lighting | BenQ e-Reading LED Desk Lamp         | `lighting-benq-e-reading-led-desk-lamp`        | High-end | Rp 4.500.000   |           |        |         |
| Desk          | IKEA LINNMON / ADILS 100×60          | `desk-ikea-linnmon-adils-100-60`               | Budget   | Rp 600.000     |           |        |         |
| Desk          | IKEA LAGKAPTEN / ALEX 140×60         | `desk-ikea-lagkapten-alex-140-60`              | Mid      | Rp 2.300.000   |           |        |         |
| Desk          | IKEA TROTTEN sit/stand 160×80        | `desk-ikea-trotten-sit-stand-160-80`           | Mid      | Rp 4.500.000   |           |        |         |
| Desk          | IKEA IDÅSEN sit/stand 160×80         | `desk-ikea-idasen-sit-stand-160-80`            | High-end | Rp 11.000.000  |           |        |         |
| Desk          | FlexiSpot E7 Pro sit/stand 140×70    | `desk-flexispot-e7-pro-sit-stand-140-70`       | High-end | Rp 9.000.000   |           |        |         |
| Chair         | IKEA FLINTAN                         | `chair-ikea-flintan`                           | Budget   | Rp 1.300.000   |           |        |         |
| Chair         | IKEA MILLBERGET                      | `chair-ikea-millberget`                        | Budget   | Rp 1.500.000   |           |        |         |
| Chair         | Fantech Alpha GC-283                 | `chair-fantech-alpha-gc-283`                   | Budget   | Rp 1.500.000   |           |        |         |
| Chair         | Secretlab TITAN Evo                  | `chair-secretlab-titan-evo`                    | High-end | Rp 9.500.000   |           |        |         |
| Chair         | Steelcase Series 1                   | `chair-steelcase-series-1`                     | High-end | Rp 9.000.000   |           |        |         |

### Specs to double-check

**Confirmed online** (maker's page or two retailer spec sheets): desk sizes and height ranges for LINNMON/ADILS (74 cm), IDÅSEN 160×80 (62–127 cm) and the FlexiSpot E7 Pro frame (63.5–128.5 cm); both MSI monitors (size, resolution, refresh, panel, weight without stand); arm limits for the Loctek D7A and D7D (27", 9 kg per arm), AOC AM400B (17–34", 9 kg), Ergotron HX (42", 19.1 kg) and Kaloc DS110 (the 9 kg / 32" "Classic" version).

**Not confirmed — from memory, please check on the product page:**

- **Desks:** LAGKAPTEN / ALEX 140×60 height (73 cm); TROTTEN 160×80 range (copied from the 120×70: 72–122 cm); FlexiSpot E7 Pro sold with a 140×70 top in Indonesia, and its height with the top (frame + 25 mm).
- **Chairs:** all 5 sizes (width, depth, height) are approximate; FLINTAN and MILLBERGET prices at IKEA Indonesia.
- **Arms:** the AM400B's mount options (clamp and grommet), and the D7D's per-arm limit (US listings say 9 kg; one review says less).
- **Speakers:** all 5 sizes (one speaker, W × D × H); the S2000MKIII and A5+ are big enough to trigger the desk-width warning on narrow desks, which is intended.
- **Small items:** sizes and weights of the headsets, keyboards, mice, mousepads, webcams, microphones and lamps; the G POWERPLAY's pad size; the Razer Kiyo, Insta360 Link and Shure MV7+ sizes; switch names (K552 "Outemu Blue", G915 X "GL Tactile").
- **Light bars:** whether the Yeelight Screen Light Bar Pro and BenQ ScreenBar Pro are USB-powered (I listed both as USB).
- **Microphones:** the Fifine AM8 and Shure MV7+ have both USB and XLR; they're listed as USB because the data has one connection.
