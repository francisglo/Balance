import React from 'react';
import storage from '../services/storage';
import skillsService from '../services/skills';
import './Lab.css';

const BUCKET_KEYWORDS = {
  needs: ['renta', 'alquiler', 'hipoteca', 'luz', 'agua', 'gas', 'internet', 'transporte', 'comida', 'salud', 'seguro', 'educacion'],
  wants: ['ocio', 'entretenimiento', 'viaje', 'restaurante', 'suscripcion', 'hobby', 'ropa', 'regalo'],
  savings: ['ahorro', 'inversion', 'inversión', 'fondo', 'emergencia'],
};

const PRESET = { needs: 0.5, wants: 0.3, savings: 0.2 };

function inferBucket(name) {
  const lower = (name || '').toLowerCase();
  if (BUCKET_KEYWORDS.savings.some(k => lower.includes(k))) return 'savings';
  if (BUCKET_KEYWORDS.needs.some(k => lower.includes(k))) return 'needs';
  if (BUCKET_KEYWORDS.wants.some(k => lower.includes(k))) return 'wants';
  return 'wants';
}

function getFinanceState() {
  const raw = localStorage.getItem('BALANCE_V1_finance');
  if (!raw) return { transactions: [], categories: [] };
  try {
    return JSON.parse(raw);
  } catch {
    return { transactions: [], categories: [] };
  }
}

function getActivitySeries(activity, days = 7) {
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const count = activity.filter(log => {
      if (!log.timestamp) return false;
      const logDate = new Date(log.timestamp);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === d.getTime();
    }).length;
    series.push(count);
  }
  return series;
}

export default function Lab() {
  const [impactDrop, setImpactDrop] = React.useState(20);
  const [finance, setFinance] = React.useState(getFinanceState());
  const [tasks, setTasks] = React.useState([]);
  const [okrs, setOkrs] = React.useState([]);
  const [activity, setActivity] = React.useState([]);

  const refresh = React.useCallback(() => {
    setTasks(storage.getCollection('tasks') || []);
    setOkrs(storage.getCollection('okrs') || []);
    setActivity(storage.getCollection('activity') || []);
    setFinance(getFinanceState());
  }, []);

  React.useEffect(() => {
    refresh();
    const id = setInterval(refresh, 1500);
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  const expenses = finance.transactions.filter(t => t.type === 'Gasto');
  const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 1;

  const bucketTotals = expenses.reduce((acc, t) => {
    const bucket = inferBucket(t.category);
    acc[bucket] = (acc[bucket] || 0) + Number(t.amount || 0);
    return acc;
  }, { needs: 0, wants: 0, savings: 0 });

  const drift = {
    needs: Math.round(((bucketTotals.needs / totalExpense) - PRESET.needs) * 100),
    wants: Math.round(((bucketTotals.wants / totalExpense) - PRESET.wants) * 100),
    savings: Math.round(((bucketTotals.savings / totalExpense) - PRESET.savings) * 100),
  };

  const okrImpact = okrs.map(okr => {
    const related = tasks.filter(t => t.okrId === okr.id);
    const score = related.reduce((sum, t) => {
      const weight = t.priority === 'alta' ? 3 : t.priority === 'media' ? 2 : 1;
      return sum + weight;
    }, 0);
    return { id: okr.id, title: okr.title, score, count: related.length };
  }).sort((a, b) => b.score - a.score);

  const inProgress = tasks.filter(t => t.status === 'inprogress').length;
  const delayed = tasks.filter(t => t.status === 'inprogress' && (t.timeInColumns?.inprogress || 0) > 3 * 24 * 3600 * 1000).length;
  const attentionIndex = Math.max(0, Math.min(100, 100 - inProgress * 8 - delayed * 15));

  const activitySeries = getActivitySeries(activity, 7);
  const habitsScore = Math.min(100, activitySeries.reduce((a, b) => a + b, 0) * 5);

  const skillsPortfolio = skillsService.getPortfolio();

  const totalIncome = finance.transactions.filter(t => t.type === 'Ingreso').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalBalance = totalIncome - (totalExpense || 0);
  const dropIncome = totalIncome * (impactDrop / 100);
  const newBalance = (totalIncome - dropIncome) - (totalExpense || 0);

  const frictionItems = tasks.filter(t => t.status !== 'done' && (t.timeInColumns?.inprogress || 0) > 2 * 24 * 3600 * 1000);

  const weekPlan = tasks
    .filter(t => (t.status || 'todo') === 'todo')
    .sort((a, b) => {
      const wa = a.priority === 'alta' ? 3 : a.priority === 'media' ? 2 : 1;
      const wb = b.priority === 'alta' ? 3 : b.priority === 'media' ? 2 : 1;
      return wb - wa;
    })
    .slice(0, 7);

  return (
    <div className="Lab-root">
      <h2>🧪 Laboratorio Estratégico</h2>
      <div className="Lab-grid">
        <div className="Lab-card">
          <h3>Radar de Deriva</h3>
          <div className="Lab-metricRow">
            <span>Necesidades</span><strong>{drift.needs}%</strong>
          </div>
          <div className="Lab-metricRow">
            <span>Deseos</span><strong>{drift.wants}%</strong>
          </div>
          <div className="Lab-metricRow">
            <span>Ahorro</span><strong>{drift.savings}%</strong>
          </div>
          <small>Comparado con regla 50/30/20</small>
        </div>

        <div className="Lab-card">
          <h3>Mapa OKR→Caja</h3>
          {okrImpact.length === 0 ? (
            <div className="Lab-empty">Sin OKRs</div>
          ) : (
            okrImpact.slice(0, 5).map(o => (
              <div key={o.id} className="Lab-metricRow">
                <span>{o.title}</span><strong>{o.score}</strong>
              </div>
            ))
          )}
          <small>Impacto estimado por prioridad</small>
        </div>

        <div className="Lab-card">
          <h3>Índice de Atención</h3>
          <div className="Lab-bigValue">{attentionIndex}</div>
          <small>Penaliza tareas en progreso y retrasos</small>
        </div>

        <div className="Lab-card">
          <h3>Simulador de Crisis</h3>
          <label>Caída de ingresos: {impactDrop}%</label>
          <input
            className="Lab-range"
            type="range"
            min="0"
            max="60"
            value={impactDrop}
            onChange={e => setImpactDrop(Number(e.target.value))}
          />
          <div className="Lab-metricRow">
            <span>Balance actual</span><strong>${totalBalance.toFixed(2)}</strong>
          </div>
          <div className="Lab-metricRow">
            <span>Balance simulado</span><strong>${newBalance.toFixed(2)}</strong>
          </div>
        </div>

        <div className="Lab-card">
          <h3>Motor de Hábitos</h3>
          <div className="Lab-bigValue">{habitsScore}</div>
          <small>Basado en actividad de 7 días</small>
        </div>

        <div className="Lab-card">
          <h3>Galaxia de Competencias</h3>
          <div className="Lab-metricRow">
            <span>Total</span><strong>{skillsPortfolio.totalSkills}</strong>
          </div>
          <div className="Lab-metricRow">
            <span>Expertas</span><strong>{skillsPortfolio.expertSkills}</strong>
          </div>
          <small>Basado en tareas completadas</small>
        </div>

        <div className="Lab-card">
          <h3>Auditoría de Fricción</h3>
          {frictionItems.length === 0 ? (
            <div className="Lab-empty">Sin bloqueos</div>
          ) : (
            frictionItems.slice(0, 4).map(t => (
              <div key={t.id} className="Lab-metricRow">
                <span>{t.title}</span><strong>⚠</strong>
              </div>
            ))
          )}
        </div>

        <div className="Lab-card">
          <h3>Semana Perfecta</h3>
          {weekPlan.length === 0 ? (
            <div className="Lab-empty">No hay tareas en TODO</div>
          ) : (
            weekPlan.map(t => (
              <div key={t.id} className="Lab-metricRow">
                <span>{t.title}</span><strong>{t.priority}</strong>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
