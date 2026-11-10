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

56 setup items. Prices copied from the data on 2026-11-11.
