import MercadoPagoConfig, { Preference, Payment } from "mercadopago";

let _client: MercadoPagoConfig | null = null;

function getClient() {
  if (!_client) {
    _client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
    });
  }
  return _client;
}

export async function createPreference(opts: {
  title: string;
  amount: number;
  userId: string;
  paymentId: string;
  backUrl: string;
}) {
  const client = getClient();
  const preference = new Preference(client);
  const result = await preference.create({
    body: {
      items: [{ id: opts.paymentId, title: opts.title, quantity: 1, unit_price: opts.amount, currency_id: "MXN" }],
      external_reference: opts.paymentId,
      notification_url: `${process.env.AUTH_URL}/api/mp/webhook`,
      back_urls: {
        success: `${opts.backUrl}?payment=ok`,
        failure: `${opts.backUrl}?payment=fail`,
        pending: `${opts.backUrl}?payment=pending`,
      },
      auto_return: "approved",
    },
  });
  return result;
}

export async function getPaymentInfo(mpPaymentId: string) {
  const client = getClient();
  const payment = new Payment(client);
  return payment.get({ id: mpPaymentId });
}
