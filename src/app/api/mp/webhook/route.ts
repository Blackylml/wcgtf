import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getPaymentInfo } from "@/lib/mercadopago";

/**
 * Verifies the MercadoPago `x-signature` HMAC.
 * Only enforced when MP_WEBHOOK_SECRET is set — otherwise we rely on the
 * getPaymentInfo() re-fetch below as the source of truth and skip validation.
 * See: https://www.mercadopago.com.mx/developers/en/docs/your-integrations/notifications/webhooks
 */
function hasValidSignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // validation disabled

  const signature = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!signature) return false;

  const parts = Object.fromEntries(
    signature.split(",").map((kv) => kv.split("=").map((s) => s.trim()) as [string, string])
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  // MercadoPago manifest template. `data.id` is lowercased when alphanumeric.
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const type = body?.type ?? req.nextUrl.searchParams.get("type");
  const dataId = body?.data?.id ?? req.nextUrl.searchParams.get("data.id");

  if (type !== "payment" || !dataId) {
    return NextResponse.json({ ok: true });
  }

  if (!hasValidSignature(req, String(dataId))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  try {
    const mpPayment = await getPaymentInfo(String(dataId));
    const externalRef = mpPayment.external_reference;
    if (!externalRef) return NextResponse.json({ ok: true });

    const payment = await prisma.payment.findUnique({ where: { id: externalRef } });
    if (!payment) return NextResponse.json({ ok: true });

    const status = mpPayment.status === "approved" ? "APPROVED"
      : mpPayment.status === "rejected" ? "REJECTED"
      : mpPayment.status === "cancelled" ? "CANCELLED"
      : "PENDING";

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status, mpPaymentId: String(dataId) },
    });
  } catch (e) {
    console.error("MP webhook error:", e);
  }

  return NextResponse.json({ ok: true });
}
