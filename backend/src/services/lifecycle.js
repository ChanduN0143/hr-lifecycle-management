// Pure business rules for HR lifecycle workflows.

function canProvisionAccess({ approvals = [] } = {}) {
  return (
    approvals.length > 0 &&
    approvals.every((approval) => approval.decision === 'approved')
  );
}

function isSlaBreached({
  dueAt,
  completedAt,
  status,
  now = new Date()
} = {}) {
  if (!dueAt) return false;

  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) return false;

  if (status === 'completed') {
    if (!completedAt) return false;

    const completionDate = new Date(completedAt);
    if (Number.isNaN(completionDate.getTime())) return false;

    return completionDate > dueDate;
  }

  if (status === 'cancelled') return false;

  return dueDate < now;
}

function canCompleteTask({ prerequisites = [] } = {}) {
  return prerequisites.every(
    (task) => task.status === 'completed'
  );
}

function dependencyGraphIsAcyclic(tasks = []) {
  const taskMap = new Map(
    tasks.map((task) => [task.task_id, task])
  );

  const visiting = new Set();
  const visited = new Set();

  function visit(taskId) {
    if (visiting.has(taskId)) return false;
    if (visited.has(taskId)) return true;

    visiting.add(taskId);

    const task = taskMap.get(taskId);

    for (const dependencyId of (task?.depends_on || [])) {
      if (
        taskMap.has(dependencyId) &&
        !visit(dependencyId)
      ) {
        return false;
      }
    }

    visiting.delete(taskId);
    visited.add(taskId);

    return true;
  }

  return tasks.every((task) => visit(task.task_id));
}

module.exports = {
  canProvisionAccess,
  isSlaBreached,
  canCompleteTask,
  dependencyGraphIsAcyclic
};
