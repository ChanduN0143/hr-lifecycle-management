# Architecture

- `frontend/`: React + Vite operations dashboard; calls REST endpoints and renders live database values.
- `backend/src/routes.js`: HTTP routes and request validation.
- `backend/src/services/lifecycle.js`: pure business rules for approval gating, task prerequisites, SLA and DAG validation.
- `backend/src/db.js`: pooled PostgreSQL access.
- `database/schema.sql`: relational schema, checks and indexes.
- `generator/generate.js`: seeded deterministic synthetic-data generation, labelled edge-case injection, CSV/JSON/SQL exports and SHA-256 manifest.
- `generator/validate.js`: reproducible integrity checks with a JSON validation report.
- `data/generated/`: generated input datasets, separate ground truth, manifest, seed SQL and validation reports.

## Workflow
1. Generate departments/roles/managers/employees and cases before child records.
2. Build task instances from role and work-location templates.
3. Record access requests, assets and audit events.
4. Inject a small set of deliberate exceptions after valid baseline generation and label each in ground truth.
5. Validate IDs, joins and counts; load SQL into PostgreSQL.
6. API queries the live database; frontend displays API results.

## Security and operational notes
Use environment variables for credentials. Never use real employee data in this demo. Add authentication, RBAC, rate limiting, structured logs, secrets management, migration tooling and security review before exposing it outside a local environment. Audit events are append-only by convention; restrict database permissions in a production deployment.
