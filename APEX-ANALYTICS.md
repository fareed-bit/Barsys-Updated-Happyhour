# Apex analytics installation — published October 22, 2026

All 20 public HTML pages load the shared consent controller from Apex, verified
on the live site after GitHub Pages release 39809958162. Collection is off until
the visitor allows it; the choice is scoped to this tab/site, revocable and
respects Global Privacy Control. No form field values are sent. Existing GTM
and other services are unchanged by this additional opt-in control.

Live verification found and repaired an older production Apex event-table
schema incompatibility. Apex release cee6cca, Cloud Run revision
barsys-apex-crm-00670-fq9, now persists visits correctly. A labeled synthetic
browser visit produced exactly one pageview after opt-in. Turning analytics
off and reloading kept that count at one. The test tab was left off.
The consent dialog after reload is saved in
verification/analytics-consent-off-20261022.png.

Controller behavior tests live in Apex: scripts/tests/analytics_consent.cjs.
Browser events are observations; Happyhours server inquiry receipts and booked
revenue are not connected. The separate Events website's saved inquiry and
explicit confirmed-booking counts are now available through its authenticated
aggregate feed, labeled as Events-only in the combined Apex dashboard.
