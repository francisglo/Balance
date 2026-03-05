import React from 'react';
import { motion } from 'framer-motion';
import storage from '../services/storage';
import './Canvas.css';

function OrbitalSystem({ okr, tasks, index }) {
  const baseRadius = 120;
  const duration = 18 + index * 2;

  const allOkrTasks = tasks.filter(t => t.okrId === okr.id);
  const totalTasks = allOkrTasks.length;
  const ringCount = Math.max(1, Math.ceil(totalTasks / 4));
  const ringStep = 30;
  const rings = Array.from({ length: ringCount }, (_, i) => baseRadius + i * ringStep);

  return (
    <div className="OrbitalSystem" key={okr.id}>
      {/* Central OKR Node */}
      <div className="NeuroCanvas-centerNode" title={okr.title}>
        <div className="NeuroCanvas-nodeContent">
          <div className="NeuroCanvas-nodeIcon">🎯</div>
          <div className="NeuroCanvas-nodeTitle">{okr.title}</div>
          <div className="NeuroCanvas-nodeStats">
            {allOkrTasks.length} tareas
          </div>
        </div>
      </div>

      {/* Orbit Rings */}
      {rings.map((r, i) => (
        <div
          key={`ring_${okr.id}_${i}`}
          className="NeuroCanvas-orbitRing"
          style={{ width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r }}
        />
      ))}

      {/* Orbiting Tasks */}
      {allOkrTasks.map((task, taskIndex) => {
        const ringIndex = taskIndex % ringCount;
        const orbitRadius = baseRadius + ringIndex * ringStep;
        const angle = (taskIndex / totalTasks) * Math.PI * 2;
        
        let statusColor = '#6bcf7f'; // TODO
        let statusLabel = 'TODO';
        if (task.status === 'inprogress') {
          statusColor = '#ffd93d';
          statusLabel = 'IN PROGRESS';
        } else if (task.status === 'review') {
          statusColor = '#00d1ff';
          statusLabel = 'REVIEW';
        } else if (task.status === 'done') {
          statusColor = '#ff6b6b';
          statusLabel = 'DONE';
        }

        const x = Math.cos(angle) * orbitRadius;
        const y = Math.sin(angle) * orbitRadius;
        const size = Math.max(42, 82 - totalTasks * 2 - ringIndex * 4);

        return (
          <motion.div
            key={task.id}
            className="NeuroCanvas-orbitingTask"
            animate={{ rotate: [0, 360] }}
            transition={{
              repeat: Infinity,
              ease: 'linear',
              duration: duration,
              delay: taskIndex * 0.3,
            }}
            style={{
              left: '50%',
              top: '50%',
              width: orbitRadius * 2,
              height: orbitRadius * 2,
              marginLeft: -orbitRadius,
              marginTop: -orbitRadius,
            }}
          >
            <motion.div
              className="NeuroCanvas-orbitingTaskInner"
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
            >
              <div
                className="NeuroCanvas-taskOrbit"
                style={{ borderColor: statusColor, width: size, height: size }}
                title={`${task.title} - ${statusLabel}`}
              >
                <div className="NeuroCanvas-taskStatus" style={{ backgroundColor: statusColor }} />
                <div className="NeuroCanvas-taskLabel">
                  {task.title.length > 15 ? task.title.slice(0, 12) + '...' : task.title}
                </div>
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function CanvasPlaceholder() {
  const [tasks, setTasks] = React.useState([]);
  const [okrs, setOkrs] = React.useState([]);
  const [viewMode, setViewMode] = React.useState('orbital');

  React.useEffect(() => {
    setTasks(storage.getCollection('tasks') || []);
    setOkrs(storage.getCollection('okrs') || []);
  }, []);

  // Si no hay OKRs, mostrar vista alternativa
  if (okrs.length === 0) {
    return (
      <div className="NeuroCanvas-root">
        <h2 className="NeuroCanvas-title">🚀 Neuro-Execution Canvas</h2>
        <div className="NeuroCanvas-empty">
          <p>No hay OKRs creados aún.</p>
          <p style={{ fontSize: '0.9rem', color: '#a8b8d0' }}>
            Crea un OKR para visualizar el sistema orbital de tareas.
          </p>
        </div>
      </div>
    );
  }

  const statusCounts = {
    todo: tasks.filter(t => (t.status || 'todo') === 'todo').length,
    inprogress: tasks.filter(t => t.status === 'inprogress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  return (
    <div className="NeuroCanvas-root">
      <h2 className="NeuroCanvas-title">🚀 Neuro-Execution Canvas</h2>

      <div className="NeuroCanvas-controls">
        <button
          className={`NeuroCanvas-viewBtn ${viewMode === 'orbital' ? 'active' : ''}`}
          onClick={() => setViewMode('orbital')}
        >
          Orbital
        </button>
        <button
          className={`NeuroCanvas-viewBtn ${viewMode === 'workflow' ? 'active' : ''}`}
          onClick={() => setViewMode('workflow')}
        >
          Flujo
        </button>
      </div>

      {viewMode === 'orbital' ? (
        <div className="NeuroCanvas-orbital">
          <div className="NeuroCanvas-systems">
            {okrs.map((okr, idx) => (
              <OrbitalSystem key={okr.id} okr={okr} tasks={tasks} index={idx} />
            ))}
          </div>
          <div className="NeuroCanvas-info">
            <p>Los OKRs son nodos centrales • Las tareas orbitan según su estado</p>
          </div>
        </div>
      ) : (
        <div className="NeuroCanvas-workflow">
          <div className="NeuroCanvas-stages">
            {[
              { key: 'todo', label: 'TODO', color: '#6bcf7f' },
              { key: 'inprogress', label: 'Progress', color: '#ffd93d' },
              { key: 'review', label: 'Review', color: '#00d1ff' },
              { key: 'done', label: 'Done', color: '#ff6b6b' },
            ].map((stage) => (
              <div key={stage.key} className="NeuroCanvas-workflowStage">
                <div
                  className="NeuroCanvas-stageHeader"
                  style={{ borderTopColor: stage.color }}
                >
                  <h3>{stage.label}</h3>
                  <span className="NeuroCanvas-stageCount" style={{ color: stage.color }}>
                    {statusCounts[stage.key]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="NeuroCanvas-metrics">
        <div className="NeuroCanvas-metric">
          <span className="NeuroCanvas-metricLabel">Total OKRs:</span>
          <span className="NeuroCanvas-metricValue">{okrs.length}</span>
        </div>
        <div className="NeuroCanvas-metric">
          <span className="NeuroCanvas-metricLabel">Total Tareas:</span>
          <span className="NeuroCanvas-metricValue">{tasks.length}</span>
        </div>
        <div className="NeuroCanvas-metric">
          <span className="NeuroCanvas-metricLabel">Completadas:</span>
          <span className="NeuroCanvas-metricValue" style={{ color: '#ff6b6b' }}>
            {statusCounts.done}
          </span>
        </div>
      </div>
    </div>
  );
}
