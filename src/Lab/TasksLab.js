import React from 'react';
import storage from '../services/storage';
import '../Lab/Lab.css';

export default function TasksLab() {
  const [tasks, setTasks] = React.useState([]);
  const [okrs, setOkrs] = React.useState([]);

  React.useEffect(() => {
    const refresh = () => {
      setTasks(storage.getCollection('tasks') || []);
      setOkrs(storage.getCollection('okrs') || []);
    };
    refresh();
    const id = setInterval(refresh, 1500);
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

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
    <div className="Lab-root Lab-embedded">
      <h2>🧪 Laboratorio de Tareas</h2>
      <div className="Lab-grid">
        <div className="Lab-card">
          <h3>Índice de Atención</h3>
          <div className="Lab-bigValue">{attentionIndex}</div>
          <small>Penaliza tareas en progreso y retrasos</small>
        </div>

        <div className="Lab-card">
          <h3>Mapa OKR→Impacto</h3>
          {okrImpact.length === 0 ? (
            <div className="Lab-empty">Sin OKRs</div>
          ) : (
            okrImpact.slice(0, 5).map(o => (
              <div key={o.id} className="Lab-metricRow">
                <span>{o.title}</span><strong>{o.score}</strong>
              </div>
            ))
          )}
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
