# HR Lifecycle Management System

A runnable full-stack starter implementing employee onboarding/offboarding coordination, task dependencies, access approvals/revocation, asset accountability, audit events, deterministic synthetic datasets and exception ground truth.

> **Data safety:** every generated person and email is synthetic. Emails use `example.test`. No public or confidential HR dataset is used.

## Features
- React + Vite dashboard with operational KPIs and searchable record tables.
- Express REST API backed by PostgreSQL (not mock API data).
- PostgreSQL schema with primary keys, foreign keys, CHECK constraints and indexes.
- Fixed-seed generator (`20261022`) and parameterized scale (`SCALE=1` baseline).
- CSV and JSON exports for every main entity, SQL seed export, SHA-256 manifest and validation reports.
- Separate `ground_truth.csv` / `ground_truth.json` for labelled edge cases.
- Pure business-rule tests for access approval gates, SLA calculations, prerequisite completion and dependency cycles.

## Requirements
- Node.js 18+ and npm
- PostgreSQL 14+

## Quick start (Windows PowerShell)
```powershell
# From the project root
npm install
npm --prefix frontend install
npm run generate
npm run validate
```

Create a database in PostgreSQL:
```sql
CREATE DATABASE hr_lifecycle;
```
Then apply schema and seed. With `psql` available:
```powershell
psql -U postgres -d hr_lifecycle -f database/schema.sql
psql -U postgres -d hr_lifecycle -f data/generated/seed.sql
```
Copy `.env.example` to `.env`, then set `DATABASE_URL` to your local credentials. Example:
```env
PORT=5000
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/hr_lifecycle
PGSSL=false
```
Start API and UI in two terminals:
```powershell
npm run server
```
```powershell
npm run client
```
Open `http://localhost:5173`; API health is `http://localhost:5000/health`.

## Data generation
```powershell
# baseline, fixed seed
npm run generate
npm run validate

# deterministic larger dataset (e.g. 2x baseline)
$env:SEED=20261022; $env:SCALE=2; npm run generate
```
The baseline targets 500 employees, 8 departments, 50 managers, 12 roles, 500 onboarding cases, 4,000 tasks, 600 assets and 300 access requests. Some counts scale with `SCALE`; departments/roles/managers remain catalog-sized. Generated outputs appear under `data/generated/`:
- `*.json` and `*.csv`: source entity datasets
- `ground_truth.*`: labelled anomaly/expected-decision records, separate from input tables
- `seed.sql`: schema plus insert statements for generated rows
- `manifest.json`: source generator, seed, scale and SHA-256 hashes
- `validation-summary.json` and `validation-report.json`: generated counts and integrity checks

## API
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health status |
| GET | `/api/dashboard` | KPI aggregates from PostgreSQL |
| GET | `/api/employees?limit=100&offset=0` | Employee list with department and role |
| GET | `/api/tasks?status=pending` | Task records, optionally filtered by status |
| GET | `/api/access-requests` | Access requests |
| GET | `/api/assets` | Asset inventory and current assignment |
| GET | `/api/offboarding-cases` | Offboarding cases and exit controls |
| GET | `/api/exceptions` | Audit events with issue labels |
| POST | `/api/access-requests/:id/approve` | Record an approval/rejection; body `{ "decision":"approved", "approver_employee_id":"EMP-000001", "comments":"Optional" }` |

The approval endpoint records the approval and updates request status inside a transaction. For a real deployment, add authenticated user identity and authorization checks; the demo endpoint accepts a provided approver ID and is not suitable for public exposure.

## Testing
```powershell
npm test
npm run validate
```
Tests cover health routing and lifecycle business rules. Tests requiring a live PostgreSQL instance should be run after the schema and seed are loaded. Do not interpret a passing unit test as proof that every browser interaction or database integration has been exercised.

## Requirement coverage and known boundaries
- Master/transaction/event datasets, deterministic identifiers, seven named edge-case labels, CSV/JSON/SQL outputs and validation artifacts are implemented.
- The dashboard is wired to live API data. It displays connection errors if the database is not configured.
- The starter schema stores task dependency IDs as JSONB and current asset assignment on the asset record. A production version should normalize these into dependency and assignment-history bridge tables, enforce graph acyclicity in the database/application, and introduce append-only state transition tables.
- Synthetic ground truth documents the deliberately injected exceptions. Some exception types intentionally violate business rules while preserving valid IDs and relationships; the validator checks referential integrity separately.
- Public GitHub publishing is a manual account action. See `docs/GITHUB_PUBLISHING.md`.

## Documentation
- `docs/ARCHITECTURE.md`
- `docs/DATA_DICTIONARY.md`
- `docs/GITHUB_PUBLISHING.md`
