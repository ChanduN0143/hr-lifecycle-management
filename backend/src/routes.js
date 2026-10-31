const express = require('express');
const { z } = require('zod');
const { randomBytes } = require('crypto');
const { query, getPool } = require('./db');

const router = express.Router();

const dbReady = async (res, fn) => {
  try {
    return await fn();
  } catch (error) {
    if (/DATABASE_URL/.test(error.message)) {
      return res.status(503).json({
        error: 'Database is not configured. Follow README database setup.'
      });
    }
    console.error(error);
    return res.status(500).json({ error: 'Database operation failed.' });
  }
};

function makeId(prefix) {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}-${date}-${randomBytes(4).toString('hex')}`;
}

async function audit(client, entityType, entityId, eventType, details = {}) {
  await client.query(
    `INSERT INTO audit_event
     (audit_event_id, entity_type, entity_id, event_type, details, created_at)
     VALUES ($1, $2, $3, $4, $5, now())`,
    [
      makeId('AUD'),
      entityType,
      entityId,
      eventType,
      JSON.stringify(details)
    ]
  );
}

// Dashboard
router.get('/dashboard', async (_req, res) => dbReady(res, async () => {
  const result = await query(`
    SELECT
      (SELECT count(*) FROM employee) AS employees,
      (SELECT count(*) FROM onboarding_case
       WHERE status NOT IN ('completed','cancelled')) AS active_onboarding,
      (SELECT count(*) FROM task_instance
       WHERE status NOT IN ('completed','cancelled')) AS open_tasks,
      (SELECT count(*) FROM task_instance
       WHERE due_at < now()
       AND status NOT IN ('completed','cancelled')) AS overdue_tasks,
      (SELECT count(*) FROM access_request
       WHERE status='active') AS active_access,
      (SELECT count(*) FROM audit_event
       WHERE issue_type IS NOT NULL) AS flagged_events
  `);
  res.json(result.rows[0]);
}));

// Employees
router.get('/employees', async (req, res) => dbReady(res, async () => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const result = await query(`
    SELECT e.*, d.name AS department_name, r.name AS role_name
    FROM employee e
    LEFT JOIN department d ON d.department_id = e.department_id
    LEFT JOIN role r ON r.role_id = e.role_id
    ORDER BY e.employee_id
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  res.json(result.rows);
}));

// Tasks
router.get('/tasks', async (req, res) => dbReady(res, async () => {
  const result = req.query.status
    ? await query(
        'SELECT * FROM task_instance WHERE status=$1 ORDER BY due_at NULLS LAST LIMIT 500',
        [req.query.status]
      )
    : await query(
        'SELECT * FROM task_instance ORDER BY due_at NULLS LAST LIMIT 500'
      );

  res.json(result.rows);
}));

// Complete a task only after all prerequisites are completed.
router.post('/tasks/:id/complete', async (req, res) => dbReady(res, async () => {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const found = await client.query(
      'SELECT * FROM task_instance WHERE task_id=$1 FOR UPDATE',
      [req.params.id]
    );

    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found.' });
    }

    const task = found.rows[0];

    if (task.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Task is already completed.' });
    }

    if (task.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cancelled tasks cannot be completed.' });
    }

    const dependencies = Array.isArray(task.depends_on)
      ? task.depends_on
      : [];

    if (dependencies.length) {
      const dependencyResult = await client.query(
        `SELECT task_id, status FROM task_instance
         WHERE task_id = ANY($1::text[])`,
        [dependencies]
      );

      if (
        dependencyResult.rowCount !== dependencies.length ||
        dependencyResult.rows.some(item => item.status !== 'completed')
      ) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Complete all prerequisite tasks before completing this task.',
          prerequisites: dependencyResult.rows
        });
      }
    }

    await client.query(
      `UPDATE task_instance
       SET status='completed', completed_at=now()
       WHERE task_id=$1`,
      [req.params.id]
    );

    await audit(client, 'TaskInstance', req.params.id, 'task_completed', {
      previous_status: task.status
    });

    await client.query('COMMIT');

    res.json({ task_id: req.params.id, status: 'completed' });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Exceptions
router.get('/exceptions', async (_req, res) => dbReady(res, async () => {
  const result = await query(`
    SELECT audit_event_id, entity_type, entity_id, event_type,
           issue_type, details, created_at
    FROM audit_event
    WHERE issue_type IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 500
  `);
  res.json(result.rows);
}));

// Access requests
router.get('/access-requests', async (_req, res) => dbReady(res, async () => {
  const result = await query(
    'SELECT * FROM access_request ORDER BY created_at DESC LIMIT 500'
  );
  res.json(result.rows);
}));

// Approve or reject an access request.
const approvalSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  approver_employee_id: z.string().min(1),
  comments: z.string().max(1000).optional()
});

router.post('/access-requests/:id/approve', async (req, res) => dbReady(res, async () => {
  const parsed = approvalSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid approval payload',
      details: parsed.error.issues
    });
  }

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const found = await client.query(
      'SELECT * FROM access_request WHERE access_request_id=$1 FOR UPDATE',
      [req.params.id]
    );

    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Access request not found.' });
    }

    const request = found.rows[0];

    if (request.status === 'revoked' || request.status === 'active') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'This access request cannot be approved in its current state.'
      });
    }

    await client.query(
      `INSERT INTO approval
       (approval_id, access_request_id, approver_employee_id,
        decision, comments, decided_at)
       VALUES ($1,$2,$3,$4,$5,now())`,
      [
        makeId('APR'),
        request.access_request_id,
        parsed.data.approver_employee_id,
        parsed.data.decision,
        parsed.data.comments || null
      ]
    );

    await client.query(
      'UPDATE access_request SET status=$1, approved_at=now() WHERE access_request_id=$2',
      [parsed.data.decision, request.access_request_id]
    );

    await audit(
      client,
      'AccessRequest',
      request.access_request_id,
      'approval_recorded',
      {
        decision: parsed.data.decision,
        approver: parsed.data.approver_employee_id
      }
    );

    await client.query('COMMIT');

    res.json({
      access_request_id: request.access_request_id,
      status: parsed.data.decision
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Revoke employee access.
router.post('/access-requests/:id/revoke', async (req, res) => dbReady(res, async () => {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const found = await client.query(
      'SELECT * FROM access_request WHERE access_request_id=$1 FOR UPDATE',
      [req.params.id]
    );

    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Access request not found.' });
    }

    const access = found.rows[0];

    if (access.status === 'revoked') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Access is already revoked.' });
    }

    await client.query(
      `UPDATE access_request
       SET status='revoked', revoked_at=now()
       WHERE access_request_id=$1`,
      [req.params.id]
    );

    await audit(client, 'AccessRequest', req.params.id, 'access_revoked', {
      employee_id: access.employee_id,
      system_name: access.system_name,
      previous_status: access.status
    });

    await client.query('COMMIT');

    res.json({
      access_request_id: req.params.id,
      status: 'revoked'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Assets
router.get('/assets', async (_req, res) => dbReady(res, async () => {
  const result = await query(
    'SELECT * FROM asset ORDER BY asset_id LIMIT 500'
  );
  res.json(result.rows);
}));

// Recover an assigned asset.
router.post('/assets/:id/recover', async (req, res) => dbReady(res, async () => {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const found = await client.query(
      'SELECT * FROM asset WHERE asset_id=$1 FOR UPDATE',
      [req.params.id]
    );

    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Asset not found.' });
    }

    const asset = found.rows[0];

    if (asset.status !== 'assigned' || !asset.assigned_employee_id) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'This asset is not currently assigned.'
      });
    }

    await client.query(
      `UPDATE asset
       SET status='available', assigned_employee_id=NULL, assigned_at=NULL
       WHERE asset_id=$1`,
      [req.params.id]
    );

    await audit(client, 'Asset', req.params.id, 'asset_recovered', {
      previous_employee_id: asset.assigned_employee_id,
      asset_type: asset.asset_type
    });

    await client.query('COMMIT');

    res.json({
      asset_id: req.params.id,
      status: 'available',
      recovered_from: asset.assigned_employee_id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Offboarding cases
router.get('/offboarding-cases', async (_req, res) => dbReady(res, async () => {
  const result = await query(
    'SELECT * FROM offboarding_case ORDER BY termination_date DESC LIMIT 500'
  );
  res.json(result.rows);
}));

// Complete an offboarding case only when required work is finished.
router.post('/offboarding-cases/:id/complete', async (req, res) => dbReady(res, async () => {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const found = await client.query(
      'SELECT * FROM offboarding_case WHERE offboarding_case_id=$1 FOR UPDATE',
      [req.params.id]
    );

    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Offboarding case not found.' });
    }

    const item = found.rows[0];

    const activeAccess = await client.query(
      `SELECT access_request_id FROM access_request
       WHERE employee_id=$1 AND status='active'`,
      [item.employee_id]
    );

    const assignedAssets = await client.query(
      `SELECT asset_id FROM asset
       WHERE assigned_employee_id=$1 AND status='assigned'`,
      [item.employee_id]
    );

    const incompleteTasks = await client.query(
      `SELECT task_id FROM task_instance
       WHERE offboarding_case_id=$1
       AND status NOT IN ('completed','cancelled')`,
      [item.offboarding_case_id]
    );

    const blockers = [];

    if (item.access_revocation_required && activeAccess.rowCount) {
      blockers.push({
        type: 'active_access',
        records: activeAccess.rows
      });
    }

    if (item.asset_recovery_required && assignedAssets.rowCount) {
      blockers.push({
        type: 'assigned_assets',
        records: assignedAssets.rows
      });
    }

    if (incompleteTasks.rowCount) {
      blockers.push({
        type: 'incomplete_tasks',
        records: incompleteTasks.rows
      });
    }

    if (blockers.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Offboarding cannot be completed until outstanding work is resolved.',
        blockers
      });
    }

    await client.query(
      `UPDATE offboarding_case
       SET status='completed'
       WHERE offboarding_case_id=$1`,
      [req.params.id]
    );

    await audit(
      client,
      'OffboardingCase',
      req.params.id,
      'offboarding_completed',
      { employee_id: item.employee_id }
    );

    await client.query('COMMIT');

    res.json({
      offboarding_case_id: req.params.id,
      status: 'completed'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

module.exports = router;


