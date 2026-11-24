/**
 * Midtrans Sandbox addresses and test details the browser needs (Phase 17a).
 * Sandbox only, on purpose: there is no production switch anywhere.
 */
export const SNAP_JS_URL = "https://app.sandbox.midtrans.com/snap/snap.js";

/**
 * The test card and simulators from Midtrans's sandbox docs (checked 17 Nov
 * 2026). Not shown in the app since Phase 20 (the presenter explains test
 * mode); kept here as the reference for docs/demo-script.md.
 */
export const SANDBOX_TEST_CARD = {
  number: "4811 1111 1111 1114",
  expiry: "any future date",
  cvv: "123",
  otp: "112233",
};
export const QRIS_SIMULATOR_URL =
  "https://simulator.sandbox.midtrans.com/v2/qris/index";
export const BCA_VA_SIMULATOR_URL =
  "https://simulator.sandbox.midtrans.com/bca/va/index";
