/* eslint-disable no-restricted-globals */
import React from 'react';
import storage from '../services/storage';
import skillsService from '../services/skills';
import './Kanban.css';

const PRIORITY_COLOR = {
  alta: '#ef4444',
  media: '#f59e0b',
  baja: '#10b981',
};

function TaskCard({ task, onChange }) {
  const move = (dir) => {
    const order = ['todo', 'inprogress', 'review', 'done'];
    const prev = task.status || 'todo';
    const idx = order.indexOf(prev);
    const newIdx = Math.min(order.length - 1, Math.max(0, idx + dir));
    const next = order[newIdx];
    const now = new Date().toISOString();

    // compute time spent in previous column
    const patch = { status: next };
    const timeInColumns = { ...(task.timeInColumns || {}) };
    const enteredAtMap = { ...(task.columnEnteredAt || {}) };
    const prevEntered = enteredAtMap[prev];
    if (prevEntered) {
      const delta = Math.max(0, new Date(now) - new Date(prevEntered));
      timeInColumns[prev] = (timeInColumns[prev] || 0) + delta;
      patch.timeInColumns = timeInColumns;
    }

    // set entered time for new column
    enteredAtMap[next] = now;
    patch.columnEnteredAt = enteredAtMap;

    // mark startedAt when moving to inprogress
    if (next === 'inprogress' && !task.startedAt) {
      patch.startedAt = now;
    }

    // mark completedAt when moving to done
    if (next === 'done') {
      patch.completedAt = now;
    }

    storage.updateItem('tasks', task.id, patch);
    // log activity
    storage.addItem('activity', {
      type: 'task.moved',
      actorId: 'local-user',
      taskId: task.id,
      from: prev,
      to: next,
      timestamp: now,
    });
    onChange && onChange();
  };

  const toggleDone = () => {
    const completed = (task.status === 'done');
    const now = new Date().toISOString();
    if (completed) {
      // undo completion -> move to todo and clear completedAt, set entered time
      const patch = { status: 'todo', completedAt: null };
      const entered = { ...(task.columnEnteredAt || {}) };
      entered['todo'] = now;
      patch.columnEnteredAt = entered;
      storage.updateItem('tasks', task.id, patch);
      storage.addItem('activity', { type: 'task.reopened', actorId: 'local-user', taskId: task.id, timestamp: now });
    } else {
      // mark done
      storage.updateItem('tasks', task.id, { status: 'done', completedAt: now, columnEnteredAt: { ...(task.columnEnteredAt || {}), done: now } });
      storage.addItem('activity', { type: 'task.completed', actorId: 'local-user', taskId: task.id, timestamp: now });
      
      // Extract and record skill from completed task
      const skill = skillsService.extractSkillFromTask(task);
      if (skill) {
        skillsService.recordSkill(skill);
      }
    }
    onChange && onChange();
  };

  const remove = () => {
    // use window.confirm to avoid ESLint no-restricted-globals error
    // eslint-disable-next-line no-restricted-globals
    if (window.confirm('Eliminar tarea?')) {
      const now = new Date().toISOString();
      storage.deleteItem('tasks', task.id);
      storage.addItem('activity', { type: 'task.deleted', actorId: 'local-user', taskId: task.id, timestamp: now });
      onChange && onChange();
    }
  };

  const okrTitle = () => {
    if (!task.okrId) return null;
    const okrs = storage.getCollection('okrs');
    const okr = okrs.find(o => o.id === task.okrId);
    return okr ? okr.title : null;
  };

  return (
    <div className="TaskCard">
      <div className="TaskCard-top">
        <div>
          <div className="TaskCard-title">{task.title}</div>
          <div className="TaskCard-sub">{task.status ? task.status.toUpperCase() : 'TODO'}{task.startedAt ? ` • Started ${new Date(task.startedAt).toLocaleDateString()}` : ''}</div>
        </div>
        <div className="TaskCard-badges">
          <span className="TaskCard-priority" style={{ background: PRIORITY_COLOR[task.priority || 'media'] }}>{(task.priority||'media').toUpperCase()}</span>
          {task.okrId && <span className="TaskCard-okr">KR: {okrTitle()}</span>}
          {/* overdue indicator */}
          {task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date() && (
            <span className="TaskCard-overdue">VENCIDA</span>
          )}
          {/* delayed indicator: inprogress spending > 3d */}
          {task.status === 'inprogress' && ((task.timeInColumns && task.timeInColumns.inprogress) ? task.timeInColumns.inprogress > 3 * 24 * 3600 * 1000 : false) && (
            <span className="TaskCard-delayed">RETRASADA</span>
          )}
        </div>
      </div>

      <div className="TaskCard-actions">
        <button onClick={() => move(-1)}>&larr;</button>
        <button onClick={toggleDone}>{task.status === 'done' ? 'Undo' : 'Done'}</button>
        <button onClick={() => move(1)}>&rarr;</button>
        <button className="danger" onClick={remove}>Del</button>
      </div>
    </div>
  );
}

export default TaskCard;