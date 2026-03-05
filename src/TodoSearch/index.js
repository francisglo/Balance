
import React from 'react';
import './TodoSearch.css';

function TodoSearch({
    searchValue, 
    setSearchValue,
  filterStatus,
  setFilterStatus,
  filterPriority,
  setFilterPriority,
  filterCategory,
  setFilterCategory,
  sortBy,
  setSortBy,
  onClearCompleted,
  onToggleAll,
  totalTodos,
  completedTodos,
}) {
    

  return (
    <div className="TodoSearch-panel">
      <input 
        placeholder="Buscar tarea..."
        className="TodoSearch" 
        value={searchValue}
        onChange={(event) =>{
          setSearchValue(event.target.value);
        }}
      />

      <div className="TodoSearch-controls">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">Estado: Todos</option>
          <option value="pending">Pendientes</option>
          <option value="completed">Completadas</option>
        </select>

        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="all">Prioridad: Todas</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>

        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="all">Categoría: Todas</option>
          <option value="personal">Personal</option>
          <option value="trabajo">Trabajo</option>
          <option value="estudio">Estudio</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="created_desc">Más recientes</option>
          <option value="created_asc">Más antiguas</option>
          <option value="priority">Por prioridad</option>
          <option value="due_asc">Por fecha límite</option>
        </select>
      </div>

      <div className="TodoSearch-actions">
        <button type="button" onClick={onToggleAll} disabled={totalTodos === 0}>
          {completedTodos === totalTodos && totalTodos > 0 ? 'Desmarcar todas' : 'Completar todas'}
        </button>
        <button type="button" onClick={onClearCompleted} disabled={completedTodos === 0}>
          Limpiar completadas
        </button>
      </div>
    </div>
  );
}
export { TodoSearch };