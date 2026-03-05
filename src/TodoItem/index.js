import React from 'react';
import { CompleteIcon } from "../TodoIcon/CompleteIcon";
import { DeleteIcon } from "../TodoIcon/DeleteIcon";
import "./TodoItem.css";

function TodoItem(props) {
  const [editingPriority, setEditingPriority] = React.useState(false);
  const [priority, setPriority] = React.useState(props.priority || 'media');
  const [editingText, setEditingText] = React.useState(false);
  const [editedText, setEditedText] = React.useState(props.text);

  const handlePriorityChange = (e) => {
    const newPriority = e.target.value;
    setPriority(newPriority);
    setEditingPriority(false);
    if(props.onPriorityChange) props.onPriorityChange(newPriority);
  };

  const priorityColors = {
    alta: '#ff6b6b',
    media: '#ffd93d',
    baja: '#6bcf7f'
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return 'Sin fecha límite';
    return `Vence: ${new Date(dateString).toLocaleDateString('es-ES')}`;
  };

  const saveTextEdit = () => {
    if (props.onEdit) {
      props.onEdit(editedText);
    }
    setEditingText(false);
  };

  return (
    <li className="TodoItem">

      <CompleteIcon
        completed={props.completed}
        onClick={props.onComplete}
      />

      <div className="TodoItem-content">
        {editingText ? (
          <div className="TodoItem-editRow">
            <input
              className="TodoItem-editInput"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              autoFocus
            />
            <button className="TodoItem-miniBtn" onClick={saveTextEdit}>Guardar</button>
            <button className="TodoItem-miniBtn" onClick={() => { setEditedText(props.text); setEditingText(false); }}>
              Cancelar
            </button>
          </div>
        ) : (
          <>
            <p
              className={`TodoItem-p ${
                props.completed ? "TodoItem-p--complete" : ""
              }`}
              onDoubleClick={() => setEditingText(true)}
              title="Doble click para editar"
            >
              {props.text}
            </p>
            <div className="TodoItem-meta">
              <span>{props.category || 'personal'}</span>
              <span>•</span>
              <span>{formatDueDate(props.dueDate)}</span>
            </div>
          </>
        )}
      </div>

      {editingPriority ? (
        <select 
          value={priority} 
          onChange={handlePriorityChange}
          className="TodoItem-prioritySelect"
          autoFocus
        >
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
        </select>
      ) : (
        <span 
          className="TodoItem-priority"
          style={{background: priorityColors[priority], cursor:'pointer'}}
          onClick={() => setEditingPriority(true)}
          title="Click para editar prioridad"
        >
          {priority.toUpperCase()}
        </span>
      )}

      <DeleteIcon
        onClick={props.onDelete}
      />

    </li>
  );
}

export { TodoItem };

