import storage from './storage';

// compute basic user metrics from local storage collections
export function getGlobalMetrics() {
  const tasks = storage.getCollection('tasks') || [];
  const okrs = storage.getCollection('okrs') || [];
  const activity = storage.getCollection('activity') || [];

  const completedTasks = tasks.filter(t => t.status === 'done');
  const completedCount = completedTasks.length;
  const totalCount = tasks.length;

  // average time per completed task (ms)
  const times = completedTasks.map(t => {
    const start = t.startedAt ? new Date(t.startedAt) : new Date(t.createdAt);
    const end = t.completedAt ? new Date(t.completedAt) : new Date();
    return Math.max(0, end - start);
  }).filter(Boolean);
  const avgTimeMs = times.length ? Math.round(times.reduce((a,b)=>a+b,0)/times.length) : 0;

  // consistency: number of days in last 28 days with at least one completion
  const now = new Date();
  const daysWindow = 28;
  const daySet = new Set();
  completedTasks.forEach(t => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    const diff = Math.floor((now - d)/(1000*60*60*24));
    if (diff < daysWindow) {
      daySet.add(d.toISOString().split('T')[0]);
    }
  });
  const consistency = Math.round((daySet.size / daysWindow) * 100); // % of active days

  // OKR completion rate: number of KRs with progress >=100 or tasks linked completed
  let okrCompletionRate = 0;
  if (okrs.length) {
    let completedKR = 0;
    let totalKR = 0;
    okrs.forEach(o=>{
      (o.krs||[]).forEach(kr=>{ totalKR++; if ((kr.progress||0) >= 100) completedKR++; });
    });
    okrCompletionRate = totalKR ? Math.round((completedKR/totalKR)*100) : 0;
  }

  return {
    totalCount,
    completedCount,
    avgTimeMs,
    consistency,
    okrCompletionRate,
    activityCount: activity.length,
  };
}

export function getImpactScore() {
  const m = getGlobalMetrics();
  // basic example formula (weights configurable)
  // weights: okr 40%, consistency 25%, completion% 20%, speed 15% (faster better)
  const completionRate = m.totalCount ? Math.round((m.completedCount / m.totalCount) * 100) : 0;
  const okr = m.okrCompletionRate;
  const consistency = m.consistency;

  // speed score: map avgTimeMs to 0-100 inversely (cap at 7 days)
  const maxMs = 7 * 24 * 3600 * 1000;
  const speedScore = m.avgTimeMs ? Math.max(0, Math.min(100, Math.round((1 - Math.min(m.avgTimeMs, maxMs)/maxMs) * 100))) : 50;

  const score = Math.round(
    okr * 0.4 +
    consistency * 0.25 +
    completionRate * 0.2 +
    speedScore * 0.15
  );

  return { score, details: { okr, consistency, completionRate, speedScore, avgTimeMs: m.avgTimeMs } };
}

export function evaluateAlerts() {
  const tasks = storage.getCollection('tasks') || [];
  const alerts = [];
  const now = new Date();

  // Rule: task in 'inprogress' more than 3 days => alert
  tasks.forEach(t => {
    if (t.status === 'inprogress') {
      const entered = (t.columnEnteredAt && t.columnEnteredAt.inprogress) ? new Date(t.columnEnteredAt.inprogress) : null;
      if (entered) {
        const ms = now - entered;
        if (ms > 3 * 24 * 3600 * 1000) {
          alerts.push({ type: 'delayed', taskId: t.id, title: t.title, sinceMs: ms, severity: 'warning' });
        }
      }
    }

    // Rule: critical task (priority alta) un-moved for 72h -> alert
    if ((t.priority || 'media') === 'alta') {
      const enteredAny = (t.columnEnteredAt && Object.values(t.columnEnteredAt).length) ? new Date(Math.max(...Object.values(t.columnEnteredAt).map(s=>new Date(s)))) : null;
      if (enteredAny) {
        const ms = now - enteredAny;
        if (ms > 72 * 3600 * 1000 && t.status !== 'done') {
          alerts.push({ type: 'critical_stalled', taskId: t.id, title: t.title, sinceMs: ms, severity: 'critical' });
        }
      }
    }

    // Rule: dueDate approaching or overdue
    if (t.dueDate && t.status !== 'done') {
      const due = new Date(t.dueDate);
      const diffDays = Math.ceil((due - now) / (1000*60*60*24));
      if (diffDays <= 0) alerts.push({ type: 'overdue', taskId: t.id, title: t.title, severity: 'critical' });
      else if (diffDays <= 2) alerts.push({ type: 'due_soon', taskId: t.id, title: t.title, daysLeft: diffDays, severity: 'warning' });
    }
  });

  return alerts;
}
