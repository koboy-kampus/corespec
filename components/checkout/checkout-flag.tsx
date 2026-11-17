"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Whether the checkout simulation is configured (lib/checkout/config.ts). The
 * root layout works it out on the server, where the secret settings are, and
 * hands the browser this one boolean, so the Checkout button and "My orders"
 * only appear when checkout really works.
 */
const CheckoutEnabled = createContext(false);

export function CheckoutFlag({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <CheckoutEnabled.Provider value={enabled}>
      {children}
    </CheckoutEnabled.Provider>
  );
}

export const useCheckoutEnabled = () => useContext(CheckoutEnabled);
