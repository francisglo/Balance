import React from 'react';
import { TodoContext } from '../TodoContext';
import './TodoForm.css';

function TodoForm() {
  const { setOpenModal, addTodo } = React.useContext(TodoContext);
  const [value, setValue] = React.useState('');
  const [priority, setPriority] = React.useState('media');
  const [category, setCategory] = React.useState('personal');
  const [dueDate, setDueDate] = React.useState('');

  const onSubmit = (event) => {
    event.preventDefault();
    if (value.trim()) {
      addTodo(value, priority, dueDate || null, category);
      setValue('');
      setPriority('media');
      setCategory('personal');
      setDueDate('');
      setOpenModal(false);
    }
  };

  const onCancel = () => {
    setOpenModal(false);
  };

  return (
    <form className="TodoForm" onSubmit={onSubmit}>
      <label>Crea tu nuevo TODO</label>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Crea tu nuevo todo..."
      />

      <div className="TodoForm-row">
        <div className="TodoForm-group">
          <label>Prioridad</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </div>

        <div className="TodoForm-group">
          <label>Categoría</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="personal">Personal</option>
            <option value="trabajo">Trabajo</option>
            <option value="estudio">Estudio</option>
          </select>
        </div>

        <div className="TodoForm-group">
          <label>Fecha límite</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="TodoForm-buttonContainer">
        <button
          type="button"
          className="TodoForm-button TodoForm-button-cancel"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="TodoForm-button TodoForm-button-add"
          disabled={!value.trim()}
        >
          Añadir
        </button>
      </div>
    </form>
  );
}

export { TodoForm };
