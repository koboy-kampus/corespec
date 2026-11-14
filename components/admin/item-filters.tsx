"use client";

import Link from "next/link";
import { Field } from "@/components/account/field";
import { Button } from "@/components/ui/button";
import { ALL_CATEGORIES, CATEGORY_LABEL } from "@/lib/categories";
import { TIERS } from "@/lib/catalogue/schema";
import { TIER_LABEL } from "@/lib/picker";
import { CheckField, SelectField } from "./inputs";

export interface ItemFilterValues {
  q: string;
  category: string;
  tier: string;
  status: string;
  unchecked: boolean;
}

/** Search and filters for /admin/items: a plain GET form, so the URL holds them. */
export function ItemFilters({ value }: { value: ItemFilterValues }) {
  return (
    <form
      method="get"
      role="search"
      aria-label="Filter the catalogue"
      className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]"
    >
      <Field
        label="Search"
        name="q"
        type="search"
        defaultValue={value.q}
        placeholder="Brand, name or id"
      />
      <SelectField
        label="Category"
        name="category"
        defaultValue={value.category}
        options={[
          { value: "", label: "All categories" },
          ...ALL_CATEGORIES.map((c) => ({
            value: c,
            label: CATEGORY_LABEL[c],
          })),
        ]}
      />
      <SelectField
        label="Tier"
        name="tier"
        defaultValue={value.tier}
        options={[
          { value: "", label: "All tiers" },
          ...TIERS.map((t) => ({ value: t, label: TIER_LABEL[t] })),
        ]}
      />
      <SelectField
        label="Status"
        name="status"
        defaultValue={value.status}
        options={[
          { value: "", label: "Active and not" },
          { value: "active", label: "In the picker" },
          { value: "inactive", label: "Out of the picker" },
        ]}
      />
      <div className="flex flex-col justify-end gap-2 sm:col-span-2 lg:col-span-1">
        <CheckField
          label="No checked listing"
          name="unchecked"
          value="1"
          defaultChecked={value.unchecked}
        />
      </div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
        <Button type="submit" size="sm">
          Filter
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href="/admin/items">Clear</Link>
        </Button>
      </div>
    </form>
  );
}
