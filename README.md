# HR Lifecycle Management System

A full-stack HR lifecycle management platform designed to coordinate employee onboarding and offboarding across HR, IT, facilities, and managers. The system tracks task dependencies, access approvals and revocation, asset recovery, operational exceptions, and audit events.

The project uses deterministic synthetic data to demonstrate realistic HR workflows while maintaining data privacy.

## 1. Key Features

### Operational Dashboard
- Real-time operational KPIs retrieved from PostgreSQL.
- Employee, onboarding, task, access, and exception summaries.
- Searchable operational records.

### Employee Lifecycle Management
- Employee master records with department, role, manager, and employment details.
- Onboarding and offboarding case tracking.
- Task ownership and prerequisite dependency tracking.
- Completion controls with dependency validation.

### Access Management
- Access request tracking.
- Approval and rejection workflow.
- Access revocation functionality.
- Approval records and audit events.

### Asset Management
- Asset inventory and assignment tracking.
- Asset recovery functionality.
- Updates to asset availability after recovery.

### Exceptions and Auditability
- Exception records for deliberately injected business-rule violations.
- Inspection of exception details.
- Audit events for important workflow actions.
- Separate ground-truth labels for expected decisions.

### Synthetic Data Generation
- Fixed-seed deterministic generator.
- Configurable dataset scale.
- CSV and JSON entity exports.
- SQL seed generation.
- SHA-256 data manifest.
- Data validation reports.

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Validation | Zod |
| Testing | Jest, Supertest |
| Data Generation | Node.js |
| Version Control | Git, GitHub |

## 3. Project Structure

```text
hr-lifecycle-management/
│
├── backend/
│   ├── server.js
│   └── src/
│       ├── app.js
│       ├── db.js
│       ├── routes.js
│       └── services/
│           └── lifecycle.js
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       └── styles.css
│
├── database/
│   └── schema.sql
│
├── generator/
│   ├── generate.js
│   └── validate.js
│
├── data/
│   └── generated/
│       └── .gitkeep
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA_DICTIONARY.md
│   └── GITHUB_PUBLISHING.md
│
├── tests/
│   ├── api.test.js
│   └── lifecycle.test.js
│
├── .env.example
├── .gitignore
├── jest.config.js
├── package.json
├── package-lock.json
└── README.md
```

## 4. Requirements

Install the following before running the application:

- Node.js 18 or later
- npm
- PostgreSQL 14 or later
- Git (optional, for version control)

## 5. Installation and Setup

### Step 1: Clone the repository

```bash
git clone https://github.com/ChanduN0143/hr-lifecycle-management.git
cd hr-lifecycle-management
```

### Step 2: Install dependencies

From the project root:

```bash
npm install
npm --prefix frontend install
```

### Step 3: Generate synthetic data

```bash
npm run generate
```

This generates the baseline synthetic datasets and supporting files.

### Step 4: Validate generated data

```bash
npm run validate
```

The validator checks identifiers, relationships, task dependencies, access approval records, offboarding controls, and ground-truth availability.

### Step 5: Create the PostgreSQL database

Open PostgreSQL and execute:

```sql
CREATE DATABASE hr_lifecycle;
```

### Step 6: Apply the database schema and generated seed

From the project root, run:

```bash
psql -U postgres -d hr_lifecycle -f database/schema.sql
psql -U postgres -d hr_lifecycle -f data/generated/seed.sql
```

### Step 7: Configure environment variables

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Configure your local database credentials in `.env`:

```env
PORT=5000
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/hr_lifecycle
PGSSL=false
```

Replace `YOUR_PASSWORD` with your local PostgreSQL password.

**Security:** Never commit `.env` or publish real database credentials.

### Step 8: Start the backend

Open a terminal in the project root:

```bash
npm run server
```

The backend runs at:

```text
http://localhost:5000
```

### Step 9: Start the frontend

Open another terminal in the project root:

```bash
npm run client
```

The frontend runs at:

```text
http://localhost:5173
```

Open the application in your browser:

http://localhost:5173

## 6. Application Workflows

The application demonstrates the following workflows:

1. **Employee onboarding:** Track employees and their onboarding tasks.
2. **Task dependency management:** Prevent task completion when required prerequisites remain incomplete.
3. **Access approvals:** Record access approval and rejection decisions.
4. **Access revocation:** Revoke active access requests.
5. **Asset recovery:** Recover assigned assets and update their availability.
6. **Employee offboarding:** Track exit cases and check outstanding clearance requirements.
7. **Exception inspection:** Examine flagged business-rule violations and their details.
8. **Audit tracking:** Record important workflow state changes.

Offboarding completion is guarded by outstanding access, asset, and task clearance requirements.

## 7. REST API

The backend exposes REST endpoints under `/api`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | API health check |
| GET | `/api/dashboard` | Operational KPI summary |
| GET | `/api/employees` | Employee records |
| GET | `/api/tasks` | Task records and filtering |
| POST | `/api/tasks/:task_id/complete` | Complete an eligible task |
| GET | `/api/access-requests` | Access request records |
| POST | `/api/access-requests/:id/approve` | Approve or reject an access request |
| POST | `/api/access-requests/:id/revoke` | Revoke access |
| GET | `/api/assets` | Asset inventory |
| POST | `/api/assets/:id/recover` | Recover an assigned asset |
| GET | `/api/offboarding-cases` | Offboarding case records |
| POST | `/api/offboarding-cases/:id/complete` | Complete an eligible offboarding case |
| GET | `/api/exceptions` | Exception and audit records |

### Example: Access Approval Request

```json
{
  "decision": "approved",
  "approver_employee_id": "EMP-000001",
  "comments": "Access request reviewed"
}
```

The approval endpoint records the decision and updates the request within a database transaction.

**Important:** This is a demonstration application. The approval endpoint accepts an approver employee ID supplied in the request. Production deployment requires authenticated identities, role-based authorization, and stronger access controls.

## 8. Synthetic Dataset

The generator uses a fixed seed:

```text
20261022
```

The baseline dataset targets:

| Entity | Target Records |
|---|---:|
| Departments | 8 |
| Roles | 12 |
| Managers | 50 |
| Employees | 500 |
| Onboarding Cases | 500 |
| Offboarding Cases | 33 |
| Task Instances | 4,000 |
| Assets | 600 |
| Access Requests | 300 |

The generated datasets include:

- Employee master data.
- Department and role records.
- Onboarding and offboarding cases.
- Task templates and task instances.
- Access requests and approval records.
- Asset inventory.
- Audit and exception records.
- Separate ground-truth labels.

All generated employee names and email addresses are synthetic. Email addresses use the reserved `example.test` domain.

### Generate a larger dataset

For example, to generate a dataset at scale 2:

```powershell
$env:SEED=20261022
$env:SCALE=2
npm run generate
```

Generated data is stored under:

```text
data/generated/
```

The generator produces CSV and JSON datasets, SQL seed files, validation reports, and a SHA-256 manifest.

## 9. Testing and Validation

Run automated tests:

```bash
npm test
```

Validate the generated dataset:

```bash
npm run validate
```

Build the frontend:

```bash
npm --prefix frontend run build
```

These checks help verify application behavior, business rules, data integrity, and frontend compilation.

A passing unit test or build does not by itself establish that every browser interaction or database integration has been tested.

## 10. Data Integrity and Business Rules

The application demonstrates several important business controls:

- Unique identifiers for primary entities.
- Referential integrity between employees, departments, roles, cases, and tasks.
- Task prerequisite validation.
- Dependency-cycle validation during data validation.
- Approval records for applicable access decisions.
- Access revocation tracking.
- Asset recovery controls.
- Offboarding completion checks.
- Separate synthetic ground-truth labels for exception analysis.

## 11. Known Limitations and Future Improvements

This project is a working demonstration and starter platform, not a production-ready HR system.

Potential improvements include:

- Authentication and role-based authorization.
- Task reassignment and ownership management.
- Automated access provisioning and deprovisioning integrations.
- Asset assignment history.
- Normalized task dependency and asset assignment history tables.
- Append-only state transition history.
- Automated notifications and escalation workflows.
- More extensive integration and end-to-end tests.
- Production deployment and monitoring.

## 12. Documentation

Additional technical documentation:

- `docs/ARCHITECTURE.md` – System architecture.
- `docs/DATA_DICTIONARY.md` – Entity and field definitions.
- `docs/GITHUB_PUBLISHING.md` – GitHub publishing instructions.

## 13. Repository

**GitHub:** https://github.com/ChanduN0143/hr-lifecycle-management

---

**Project:** HR Lifecycle Management System  
**Purpose:** Employee onboarding and offboarding workflow coordination  
**Architecture:** React + Express + PostgreSQL  
**Data:** Deterministic synthetic datasets  
**Repository Visibility:** Public
