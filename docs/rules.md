# CoreSpec rules

Every check CoreSpec runs on a build. Each rule is a pure function on plain objects: it gets the chosen parts and returns one result (`id`, `severity`, `message`, `partIds`) or nothing. The builder, the shared page, the picker hints and the tests all read the same functions.

- PC rules: `lib/compat/rules.ts`, run by `check()` in `lib/compat/check.ts`, tests in `lib/compat/rules.test.ts`.
- Setup rules: `lib/compat/setup-rules.ts`, run by `checkSetup()`, tests in `lib/compat/setup-rules.test.ts`.

**Severities.** _Error_: the parts don't work together, and the build shows as "incompatible". _Warning_: it works, but with a real drawback. _Info_: a note. Setup rules are warning or info only: a setup choice never makes a build incompatible.

A rule only runs when every part it reads has been picked. For example, the GPU-based setup rules stay silent until a GPU is chosen.

## PC rules (9, plus one reminder)

| #   | Rule (id)                             | Inputs                                        | Condition                                                     | Severity        | Message (example)                                                              |
| --- | ------------------------------------- | --------------------------------------------- | ------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------ |
| 1   | CPU socket (`cpu-socket`)             | CPU `socket`, motherboard `socket`            | Sockets differ                                                | Error           | The CPU uses AM4, but the motherboard has an AM5 socket.                       |
| 2   | Memory type (`memory-type`)           | RAM `ddr`, motherboard `ddr`                  | DDR generations differ                                        | Error           | The memory is DDR4, but the motherboard only takes DDR5.                       |
| 3   | RAM slots (`ram-slots`)               | RAM `sticks`, motherboard `ramSlots`          | More sticks than slots                                        | Error           | This kit has 4 sticks, but the motherboard only has 2 slots.                   |
| 4   | Board fits case (`board-fits-case`)   | Motherboard `formFactor`, case `formFactors`  | The case doesn't list the board's form factor                 | Error           | An ATX motherboard doesn't fit this case (it takes mATX, ITX).                 |
| 5   | GPU clearance (`gpu-clearance`)       | GPU `lengthMm`, case `maxGpuMm`               | GPU longer than the case allows                               | Error           | The graphics card is 340 mm long, but the case fits up to 315 mm.              |
| 6   | Cooler clearance (`cooler-clearance`) | Cooler `type`, `heightMm`, case `maxCoolerMm` | Air cooler taller than the case allows (AIOs skip this)       | Error           | The cooler is 165 mm tall, but the case fits up to 155 mm.                     |
| 7   | Cooler socket (`cooler-socket`)       | Cooler `sockets`, CPU `socket`                | The cooler doesn't list the CPU's socket                      | Error           | The cooler doesn't support the LGA1851 socket (it supports AM5, AM4, LGA1700). |
| 8   | PSU size (`psu-size`)                 | PSU `formFactor`, case `psuFF`                | SFX-only case with an ATX PSU (SFX fits ATX cases)            | Error           | This case only takes an SFX power supply, and this one is ATX.                 |
| 9   | PSU headroom (`psu-headroom`)         | PSU `watts`, estimated draw (see below)       | PSU below the draw → error; below 1.3 × the draw → warning    | Error / Warning | Low headroom: aim for at least 397 W for an estimated draw of 305 W.           |
| –   | Missing parts (`missing-parts`)       | The 8 PC slots                                | Any PC slot empty (setup slots are optional and never listed) | Info            | Still to pick: Cooler, Case.                                                   |

**Estimated draw** (`lib/power.ts`): CPU TDP + GPU TDP + 50 W board + 5 W per RAM stick + 5 W per drive + 15 W fans. Setup items aren't counted: they plug into the wall, not the PSU.

## Setup rules (Phase 11)

| #   | Rule (id)                                        | Inputs                                                     | Condition                                                                                         | Severity | Message (example)                                                                                          |
| --- | ------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| 10  | Monitor resolution vs GPU (`monitor-resolution`) | Monitor `resolution`, GPU `targetRes`                      | Monitor resolution above the GPU's class (order: 1080p < 1440p < ultrawide 1440p < 4K)            | Warning  | This GPU is aimed at 1080p; a 4K monitor will need lower settings.                                         |
| 11  | Refresh rate vs GPU (`monitor-refresh`)          | Monitor `refreshHz`, `resolution`, GPU `targetRes`         | 165 Hz or more **and** a resolution above the GPU's class                                         | Info     | High refresh rates (165 Hz) at 1440p are hard to reach with this GPU.                                      |
| 12  | Sync tech vs GPU brand (`sync-vendor`)           | Monitor `adaptiveSync`, GPU `vendor`                       | A G-Sync hardware module with a non-NVIDIA GPU. FreeSync monitors stay silent (they work on both) | Info     | This monitor's G-Sync module needs an NVIDIA GPU for variable refresh; it still works as a normal monitor. |
| 13  | Desk width (`desk-width`)                        | Desk `widthMm`, monitor width, speaker width               | Monitor width + 2 × (speaker width + 50 mm gap) is more than the desk's width                     | Warning  | The monitor and speakers need about 120.7 cm of desk, but this desk is 105 cm wide.                        |
| 14  | Monitor arm vs monitor (`arm-fit`)               | Arm `maxSizeIn`, `maxLoadKg`; monitor `sizeIn`, `weightKg` | Monitor bigger than the arm's limit, or heavier than its load (per monitor)                       | Warning  | This monitor arm can't safely hold the monitor: 34″ is above its 27″ limit.                                |

**GPU class (`targetRes`)** is a rough, hand-picked class per GPU (the resolution it's aimed at in current games at high settings), stated as approximate in `types/parts.ts`. It is a guide, not a benchmark.

**Desk width numbers** come from `frontageMm()` in `lib/desk.ts`, the same function the 3D desk (Phase 12) uses to place the monitor and speakers, so the warning and the picture agree.

**Monitor weight** is the panel without its stand (what an arm holds), approximate.

## Where results show

- **Builder:** the summary's compat panel lists PC results under _Compatibility_ and setup results under _Setup checks_. Clicking a warning opens the picker for the first item involved. Slots involved in an error or warning get a badge.
- **Picker:** each option shows the error or warning picking it would cause, PC and setup rules alike (e.g. a 1080p-class GPU while a 4K monitor is chosen).
- **Shared build page:** the same panel, read-only.
- **Build status badge:** counts PC errors and warnings only, so "Compatible" always describes the PC.
