import { app } from './app.js';
import { sweepExpiredStripePayments } from './modules/bookings/bookings.routes.js';

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
  void sweepExpiredStripePayments();
  setInterval(() => void sweepExpiredStripePayments(), 30_000).unref();
});
