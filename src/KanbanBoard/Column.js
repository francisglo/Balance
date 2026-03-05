import React from 'react';
import TaskCard from './TaskCard';
import storage from '../services/storage';

function Column({ status, tasks, onChange }) {
  const [showForm, setShowForm] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState('media');
  const [dueDate, setDueDate] = React.useState('');
  const [okrId, setOkrId] = React.useState('');
  const [okrs, setOkrs] = React.useState([]);

  const handleShow = () => setShowForm(true);
  const handleCancel = () => { setShowForm(false); setTitle(''); };
  
  React.useEffect(() => {
    const list = storage.getCollection('okrs') || [];
    setOkrs(list);
  }, []);

  const handleSubmit = (e) => {
    e && e.preventDefault();
    const value = title && title.trim();
    if (!value) return;
    const now = new Date().toISOString();
    const newTask = storage.addItem('tasks', {
      title: value,
      status: status.key,
      priority: priority || 'media',
      assignees: [],
      okrId: okrId || null,
      dueDate: dueDate || null,
      createdAt: now,
      // track when task entered each column
      columnEnteredAt: { [status.key]: now },
      // accumulate ms spent per column
      timeInColumns: {},
      startedAt: null,
      completedAt: null,
    });
    // record activity event for task creation
    storage.addItem('activity', {
      type: 'task.created',
      actorId: 'local-user',
      taskTitle: value,
      taskId: newTask.id,
      to: status.key,
      priority: priority,
      dueDate: dueDate || null,
      okrId: okrId || null,
      timestamp: now,
    });
    setTitle('');
    setPriority('media');
    setDueDate('');
    setOkrId('');
    setShowForm(false);
    onChange && onChange();
  };

  const canAddTask = status.key === 'todo';
  const effectiveShowForm = showForm && canAddTask;

  return (
    <div className="KanbanColumn">
      <div className="KanbanColumn-header">
        <h4>{status.label}</h4>
        {canAddTask && !showForm ? (
          <button className="KanbanColumn-add" onClick={handleShow}>+ Add</button>
        ) : null}
      </div>

      {effectiveShowForm && (
        <form className="KanbanColumn-addForm" onSubmit={handleSubmit}>
          <input
            className="KanbanColumn-input"
            placeholder={`Nueva tarea en ${status.label}`} 
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            autoFocus
          />
          <div className="KanbanColumn-row">
            <select className="KanbanColumn-select" value={priority} onChange={e=>setPriority(e.target.value)}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
            <input className="KanbanColumn-input" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
            <select className="KanbanColumn-select" value={okrId} onChange={e=>setOkrId(e.target.value)}>
              <option value="">Sin OKR</option>
              {okrs.map(o=> <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          <div className="KanbanColumn-addBtns">
            <button type="submit" className="btn">Add</button>
            <button type="button" className="btn btn-cancel" onClick={handleCancel}>Cancel</button>
          </div>
        </form>
      )}

      <div className="KanbanColumn-list">
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} onChange={onChange} />
        ))}
        {tasks.length === 0 && <div className="KanbanColumn-empty">Sin tareas</div>}
      </div>
    </div>
  );
}

export default Column;