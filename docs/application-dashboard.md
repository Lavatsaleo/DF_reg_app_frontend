# Application dashboard

Use the existing staff login. Committee roles retain their committee workspace. `VIEWER` is now the dashboard-only role; existing VIEWER accounts will land on the dashboard and cannot read individual applications or committee records. Super Admin (`ADMIN`) can open both workspaces.

As Super Admin, select Dashboard, expand Manage dashboard access, and create a dashboard user. Select one country to restrict their statistics or All four countries for programme-wide access. Share credentials through your normal secure process. This feature does not send account emails.

The dashboard starts with live application aggregates. Showcase data uses deterministic synthetic records for the last six months, clearly labelled; it never inserts demonstration applicants in the database. Country and UTC submission-month filters apply to all indicators and the regional map. Ages are those recorded at application. Application totals count submitted applicant records, not drafts. ICT results use the latest submitted attempt. Missing ages/regions remain in totals and regional tables.

Map bubbles represent counts within first-level administrative boundaries, not addresses or population-adjusted rates. See src/data/APPLICATION_MAP_SOURCES.md for source dates, licences and transformations.

Deploy the matching frontend and backend DEV changes together. No new package dependency or database migration is required for this dashboard. The backend exposes authenticated GET /api/dashboard; access and country scope are enforced server-side.

Validation: production frontend build and lint; backend node --test tests/applicationDashboard.test.js. Live database behaviour should also be checked against your local application records.
