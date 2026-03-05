import React from 'react';
import Column from './Column';
import storage from '../services/storage';
import './Kanban.css';

const STATUSES = [
  { key: 'todo', label: 'To Do' },
  { key: 'inprogress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

function Board() {
  const [tasks, setTasks] = React.useState([]);

  React.useEffect(() => {
    const all = storage.getCollection('tasks');
    setTasks(all);
  }, []);

  const refresh = () => setTasks(storage.getCollection('tasks'));

  return (
    <div className="KanbanBoard">
      {STATUSES.map(status => (
        <Column
          key={status.key}
          status={status}
          tasks={tasks.filter(t => (t.status || 'todo') === status.key)}
          onChange={refresh}
        />
      ))}
    </div>
  );
}

export default Board;