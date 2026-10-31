# Data dictionary

Types use PostgreSQL conventions. `required` means NOT NULL unless stated. IDs are immutable text primary keys. All timestamps are UTC. Synthetic email addresses use `example.test` and are not real people.

| Entity | Field | Type | Required | Constraints / meaning |
|---|---|---|---|---|
| Department | department_id | TEXT | Yes | PK, `DEP-###` |
| Department | name | TEXT | Yes | Unique, non-empty |
| Role | role_id | TEXT | Yes | PK, `ROLE-###` |
| Role | name | TEXT | Yes | Unique role title |
| Role | access_profile | TEXT | Yes | Access-profile category |
| Manager | manager_id | TEXT | Yes | PK, `MGR-######` |
| Manager | employee_id | TEXT | Yes | Unique FK to Employee |
| Manager | department_id | TEXT | Yes | FK to Department |
| Employee | employee_id | TEXT | Yes | PK, `EMP-######` |
| Employee | first_name / last_name | TEXT | Yes | Synthetic name values |
| Employee | email | TEXT | Yes | Unique, synthetic `.test` domain |
| Employee | department_id / role_id | TEXT | Yes | FKs to Department and Role |
| Employee | manager_id | TEXT | No | Optional FK; null is an explicitly labelled edge case when applicable |
| Employee | employment_type | ENUM-like TEXT | Yes | `permanent`, `contractor` |
| Employee | work_location | ENUM-like TEXT | Yes | `remote`, `on_site` |
| Employee | status | ENUM-like TEXT | Yes | `active`, `terminated` |
| Employee | hire_date / start_date | DATE | Yes | ISO date; compare for policy exceptions |
| OnboardingCase | onboarding_case_id | TEXT | Yes | PK, `ONB-YYYY-######` |
| OnboardingCase | employee_id | TEXT | Yes | Unique FK to Employee; one initial case per employee |
| OnboardingCase | process_owner_employee_id | TEXT | No | FK to Employee |
| OnboardingCase | status | TEXT | Yes | `pending`, `in_progress`, `completed`, `cancelled` |
| OnboardingCase | start_date / target_completion_date | DATE | Yes | Target date must be on/after start date |
| TaskTemplate | task_template_id | TEXT | Yes | PK, `TT-####` |
| TaskTemplate | role_id | TEXT | Yes | FK to Role |
| TaskTemplate | work_location | TEXT | Yes | `remote`, `on_site` |
| TaskTemplate | task_name | TEXT | Yes | Required task title |
| TaskTemplate | sla_days | INTEGER | Yes | Non-negative number of calendar days |
| TaskTemplate | dependency_key | TEXT | Yes | Comma-separated template dependency hints |
| TaskInstance | task_id | TEXT | Yes | PK, `TASK-ONB-<case-id>-###` |
| TaskInstance | onboarding_case_id / employee_id | TEXT | Yes | FKs to onboarding case and employee |
| TaskInstance | offboarding_case_id | TEXT | No | Optional FK to OffboardingCase; populated for exit tasks |
| TaskInstance | task_template_id | TEXT | Yes | FK to template |
| TaskInstance | owner_employee_id | TEXT | No | Optional FK; null owner is a validation exception |
| TaskInstance | status | TEXT | Yes | `pending`, `in_progress`, `completed`, `cancelled` |
| TaskInstance | due_at / completed_at | TIMESTAMPTZ | No | UTC; completion after due date is an SLA breach |
| TaskInstance | depends_on | JSONB | Yes | List of task IDs; must form an acyclic graph |
| OffboardingCase | offboarding_case_id | TEXT | Yes | PK, `OFF-YYYY-######` |
| OffboardingCase | employee_id | TEXT | Yes | FK to Employee; one generated exit case per terminated employee |
| OffboardingCase | process_owner_employee_id | TEXT | No | FK to Employee |
| OffboardingCase | status | TEXT | Yes | `pending`, `in_progress`, `completed`, `cancelled` |
| OffboardingCase | termination_date | DATE | Yes | Effective exit date |
| OffboardingCase | access_revocation_required / asset_recovery_required | BOOLEAN | Yes | Required exit controls |
| Asset | asset_id | TEXT | Yes | PK, `AST-<TYPE>-######` |
| Asset | asset_type / serial_number | TEXT | Yes | Type and unique serial number |
| Asset | status | TEXT | Yes | `available`, `assigned`, `repair`, `retired` |
| Asset | assigned_employee_id | TEXT | No | FK to Employee; required when assigned |
| Asset | assigned_at | DATE | No | Assignment date |
| AccessRequest | access_request_id | TEXT | Yes | PK, `ACCREQ-YYYY-######` |
| AccessRequest | employee_id | TEXT | Yes | FK to Employee |
| AccessRequest | system_name | TEXT | Yes | Target system name |
| AccessRequest | requested_by_employee_id | TEXT | No | FK to Employee |
| AccessRequest | status | TEXT | Yes | `pending`, `approved`, `rejected`, `active`, `revoked` |
| AccessRequest | created_at / approved_at / revoked_at | TIMESTAMPTZ | Mixed | Created required; approval/revocation optional |
| Approval | approval_id | TEXT | Yes | PK |
| Approval | access_request_id / approver_employee_id | TEXT | Yes | FKs to request and employee |
| Approval | decision | TEXT | Yes | `approved`, `rejected` |
| Approval | comments | TEXT | No | Optional audit context |
| Approval | decided_at | TIMESTAMPTZ | Yes | Decision timestamp |
| AuditEvent | audit_event_id | TEXT | Yes | PK, `AUD-YYYY-MM-DD-######` |
| AuditEvent | entity_type / entity_id / event_type | TEXT | Yes | Entity reference and event type; entity_id polymorphic reference |
| AuditEvent | issue_type | TEXT | No | Label for known exception |
| AuditEvent | details | JSONB | Yes | Event payload, not a source of executable instructions |
| AuditEvent | created_at | TIMESTAMPTZ | Yes | UTC event timestamp |

## Relationships and cardinality
- Department 1:N Employee and Manager; Role 1:N Employee and TaskTemplate.
- Manager 1:1 Employee in this starter schema; Employee 1:N access requests and tasks; terminated employees receive an OffboardingCase.
- Employee 1:1 initial OnboardingCase (the generated workflow models one initial onboarding per employee).
- OnboardingCase 1:N TaskInstance; TaskTemplate 1:N TaskInstance.
- Employee 1:N assigned assets over time is represented in the starter export as current assignment on Asset; production-grade assignment history should be a separate asset_assignment table.
- AccessRequest 1:N Approval; AuditEvent is append-only and polymorphically references a business entity.
- TaskInstance N:M TaskInstance dependencies are represented as JSON task-ID arrays in this starter schema to simplify export. For a stricter normalized production deployment, use a `task_dependency(prerequisite_task_id, dependent_task_id)` bridge table with two foreign keys and a cycle check.

Effective dates are explicit for employee dates, assignment dates, and event timestamps. This synthetic baseline is designed for evaluation and local demonstration; it is not a substitute for a security-reviewed production HR platform.
