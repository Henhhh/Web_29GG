# Order history

Open Account > My Orders after logging in.

- `OrderHistory.tsx`: six orders per page, newest first, and order details; loading, empty and retry states.
- `orders.css`: responsive styling using the existing shop theme and Overlay.
- API calls reuse `../checkout/ordersApi.ts` and the shared JWT client. Pending requests are aborted when leaving a view.
- Backend: `GET /api/orders` and `GET /api/orders/<id>` in `backend/routes/orders.py`. Both scope queries to the authenticated user. List page is 1–999999999; page_size is 1–100.
- Database: existing `orders`, `order_items`, `payments` tables. No migration or reseed is needed. Historical prices, contact and delivery information come from saved order snapshots.
- This displays current stored statuses; it does not add shipping tracking, cancellation or payment confirmation.

Manual checks: empty account, multiple pages, pickup/home delivery details, retry after network failure, close while loading, expired login and a second account. Check mobile width and keyboard navigation as well.
