import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SOFTWARE } from "./software";

describe("software credits", () => {
  it.each(SOFTWARE.map((s) => [s.pkg, s] as const))(
    "%s licence matches the installed package",
    (pkg, s) => {
      const json = JSON.parse(
        readFileSync(
          join(process.cwd(), "node_modules", pkg, "package.json"),
          "utf8",
        ),
      ) as { license?: string };
      expect(json.license).toBe(s.licence);
    },
  );
});
