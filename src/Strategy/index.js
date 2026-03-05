import React from 'react';
import storage from '../services/storage';
import skillsService from '../services/skills';
import './Strategy.css';

function getDexState() {
  const raw = localStorage.getItem('BALANCE_V1_dex');
  if (!raw) return { contacts: [], messages: {} };
  try {
    return JSON.parse(raw);
  } catch {
    return { contacts: [], messages: {} };
  }
}

export default function StrategyHub() {
  const [tasks, setTasks] = React.useState([]);
  const [okrs, setOkrs] = React.useState([]);
  const [dex, setDex] = React.useState(getDexState());
  const [skills, setSkills] = React.useState(skillsService.getPortfolio());

  const refresh = React.useCallback(() => {
    setTasks(storage.getCollection('tasks') || []);
    setOkrs(storage.getCollection('okrs') || []);
    setDex(getDexState());
    setSkills(skillsService.getPortfolio());
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

  const totalTasks = tasks.length || 0;
  const linkedTasks = tasks.filter(t => t.okrId).length;
  const alignment = totalTasks > 0 ? Math.round((linkedTasks / totalTasks) * 100) : 0;

  const inProgress = tasks.filter(t => t.status === 'inprogress').length;
  const delayed = tasks.filter(t => t.status === 'inprogress' && (t.timeInColumns?.inprogress || 0) > 3 * 24 * 3600 * 1000).length;
  const focusLoad = Math.max(0, Math.min(100, 100 - inProgress * 10 - delayed * 20));

  const reviewCount = tasks.filter(t => t.status === 'review').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const qualityRatio = totalTasks > 0 ? Math.round((reviewCount / totalTasks) * 100) : 0;

  const totalContacts = dex.contacts.length;
  const totalMessages = Object.values(dex.messages || {}).reduce((sum, list) => sum + (list?.length || 0), 0);

  return (
    <div className="Strategy-root">
      <h2>🧭 Centro de Estrategia</h2>
      <div className="Strategy-grid">
        <section className="Strategy-card">
          <h3>Estrategia</h3>
          <div className="Strategy-metric">
            <span>Alineación OKR</span>
            <strong>{alignment}%</strong>
          </div>
          <div className="Strategy-metric">
            <span>OKRs activos</span>
            <strong>{okrs.length}</strong>
          </div>
          <small>Porcentaje de tareas vinculadas a OKR.</small>
        </section>

        <section className="Strategy-card">
          <h3>Energía / Foco</h3>
          <div className="Strategy-bigValue">{focusLoad}</div>
          <div className="Strategy-metric">
            <span>En progreso</span>
            <strong>{inProgress}</strong>
          </div>
          <div className="Strategy-metric">
            <span>Retrasos</span>
            <strong>{delayed}</strong>
          </div>
          <small>Menos carga = mejor foco.</small>
        </section>

        <section className="Strategy-card">
          <h3>Aprendizaje</h3>
          <div className="Strategy-metric">
            <span>Total skills</span>
            <strong>{skills.totalSkills}</strong>
          </div>
          <div className="Strategy-metric">
            <span>Expertas</span>
            <strong>{skills.expertSkills}</strong>
          </div>
          <div className="Strategy-metric">
            <span>Intermedias</span>
            <strong>{skills.intermediateSkills}</strong>
          </div>
          <small>Portfolio activo desde tareas completadas.</small>
        </section>

        <section className="Strategy-card">
          <h3>Colaboración</h3>
          <div className="Strategy-metric">
            <span>Contactos</span>
            <strong>{totalContacts}</strong>
          </div>
          <div className="Strategy-metric">
            <span>Mensajes</span>
            <strong>{totalMessages}</strong>
          </div>
          <small>Datos sincronizados con Dex.</small>
        </section>

        <section className="Strategy-card">
          <h3>Control de Calidad</h3>
          <div className="Strategy-metric">
            <span>En revisión</span>
            <strong>{reviewCount}</strong>
          </div>
          <div className="Strategy-metric">
            <span>Completadas</span>
            <strong>{doneCount}</strong>
          </div>
          <div className="Strategy-metric">
            <span>Ratio revisión</span>
            <strong>{qualityRatio}%</strong>
          </div>
          <small>Cuida la etapa de revisión.</small>
        </section>
      </div>
    </div>
  );
}
