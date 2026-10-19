import { app } from './app.js';
import { pollStripePayments } from './modules/bookings/bookings.routes.js';

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
  const poll = () => {
    void pollStripePayments().catch((error: unknown) =>
      console.error('Stripe payment polling failed', error),
    );
  };
  poll();
  setInterval(poll, 5_000).unref();
});
