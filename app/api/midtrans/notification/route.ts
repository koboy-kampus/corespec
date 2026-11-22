import { checkoutConfig } from "@/lib/checkout/config";
import { handleNotification } from "@/lib/checkout/service";
import { anonOrderStore } from "@/lib/checkout/store";

/**
 * Midtrans's Payment Notification URL (Phase 17a): set it in the Midtrans
 * dashboard to https://<production domain>/api/midtrans/notification. A Vercel
 * preview is behind Vercel's login, so there the order page's "Check payment
 * status" (refreshOrder) is the only path, and it's enough on its own.
 *
 * POST only; never cached (Route Handlers other than GET aren't). Not in
 * proxy.ts's matcher: there's no session here, and none is needed. The body is
 * only trusted after its signature checks out, and even then the status is
 * confirmed with Midtrans's status API (lib/checkout/service.ts).
 */
export async function POST(request: Request) {
  const config = checkoutConfig();
  if (!config) return new Response("Not found", { status: 404 });
  const store = await anonOrderStore(config.writeSecret);
  if (!store) return new Response("Not found", { status: 404 });

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const result = await handleNotification({ config, store }, body);
  return Response.json(
    { ok: result.status === 200 },
    { status: result.status },
  );
}
