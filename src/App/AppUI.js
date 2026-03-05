import { TodoCounter } from '../TodoCounter';
import { TodoSearch } from '../TodoSearch';
import { TodoList } from '../TodoList';
import { TodoItem } from '../TodoItem';
import { TodosLoading } from '../TodosLoading';
import { TodosError } from '../TodosError';
import { EmptyTodos } from '../EmptyTodos';
import { CreateTodoButton } from '../CreateTodoButton';
import { Modal } from '../Modal';
import { TodoForm } from '../TodoForm';
import { ProductivityDashboard } from '../ProductivityDashboard';
import KanbanBoard from '../KanbanBoard/Board';
import OKRList from '../OKRs/OKRList';
import NoteEditor from '../Notes/NoteEditor';
import Canvas from '../NeuroCanvas/Canvas';
import ExecutionProfile from '../ExecutionProfile';
import Alerts from '../Alerts/Alerts';
import SkillsPortfolio from '../Skills';
import { Link } from 'react-router-dom';
import Lab from '../Lab';
import Dex from '../Dex';
import TasksLab from '../Lab/TasksLab';
import StrategyHub from '../Strategy';
import CoworkingSpace from '../Coworking';
import DocumentSuite from '../DocumentSuite';
import Notifications from '../Notifications';

import React from 'react';
import { TodoContext } from '../TodoContext';
import './AppUI.css';

function AppUI({ onLogout, username, sessionToken }) {
  const [view, setView] = React.useState('kanban');
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [showDashboard, setShowDashboard] = React.useState(true);
  const [showLab, setShowLab] = React.useState(() => {
    const saved = localStorage.getItem('BALANCE_UI_lab');
    return saved ? saved === 'true' : true;
  });
  const views = ['dashboard', 'strategy', 'okrs', 'notes', 'canvas', 'skills', 'dex', 'notifications', 'coworking', 'documents', 'kanban'];
  const viewLabels = {dashboard:'Dashboard', strategy:'Estrategia', okrs:'OKRs', notes:'Notes', canvas:'Canvas', skills:'Skills', dex:'Dex', notifications:'Notificaciones', coworking:'Coworking', documents:'Documentos', kanban:'Kanban'};

  React.useEffect(() => {
    localStorage.setItem('BALANCE_UI_lab', String(showLab));
  }, [showLab]);
  return (
    <TodoContext.Consumer>
      {({
        loading,
        error,
        completedTodos,
        totalTodos,
        searchValue,
        setSearchValue,
        searchedTodos,
        filterStatus,
        setFilterStatus,
        filterPriority,
        setFilterPriority,
        filterCategory,
        setFilterCategory,
        sortBy,
        setSortBy,
        completeTodo,
        deleteTodo,
        updateTodoPriority,
        editTodo,
        clearCompletedTodos,
        toggleAllTodos,
        openModal,
        setOpenModal,
        todos,
      }) => (
        <>
          <div className="AppUI-layout">
            <div className="AppUI-main">
              <div className="AppUI-topbar">
                <img
                  src={`${process.env.PUBLIC_URL}/balance.gif`}
                  alt="Balance logo dinámico"
                  className="AppUI-logo"
                />
                <button className='btn' onClick={()=>setDropdownOpen(!dropdownOpen)}>☰ {viewLabels[view]}</button>
                <Link to="/finance" className="btn" style={{textDecoration:'none'}}>💰 Finanzas</Link>
                {username && <span className="muted">👤 {username}</span>}
                {onLogout && <button className='btn' onClick={onLogout}>Cerrar sesión</button>}
                {view === 'dashboard' && (
                  <button className='btn' onClick={() => setShowDashboard((prev) => !prev)}>
                    {showDashboard ? 'Ocultar dashboard' : 'Mostrar dashboard'}
                  </button>
                )}
              </div>
              {dropdownOpen && (
                <div style={{position:'absolute', top:44, left:0, background:'rgba(11,15,26,0.95)', border:'1px solid rgba(255,255,255,0.03)', borderRadius:8, minWidth:160, zIndex:999}}>
                  {views.map(v=> <button key={v} style={{width:'100%', textAlign:'left', background:v===view?'rgba(0,209,255,0.1)':'transparent', border:'none', padding:'8px 12px', cursor:'pointer', color:v===view?'#00d1ff':'#e6eef8', fontWeight:v===view?600:400, display:'block'}} onClick={()=>{setView(v); setDropdownOpen(false)}}>{viewLabels[v]}</button>)}
                </div>
              )}
              {view === 'dashboard' && (showDashboard ? (
                <ProductivityDashboard />
              ) : (
                <div className="AppUI-dashboardHidden">
                  Dashboard oculto. Usa el botón para mostrarlo.
                </div>
              ))}
              {view === 'okrs' && <OKRList />}
              {view === 'notes' && <NoteEditor />}
              {view === 'canvas' && <Canvas />}
              {view === 'skills' && <SkillsPortfolio />}
              {view === 'strategy' && <StrategyHub />}
              {view === 'dex' && <Dex username={username} sessionToken={sessionToken} />}
              {view === 'notifications' && <Notifications sessionToken={sessionToken} />}
              {view === 'coworking' && <CoworkingSpace username={username} sessionToken={sessionToken} />}
              {view === 'documents' && <DocumentSuite />}
              {view === 'kanban' && (
                <>
                  <KanbanBoard />
                  <TasksLab />
                </>
              )}
            </div>
            <div className="AppUI-side">
              <ExecutionProfile />
              <div className="AppUI-labHeader">
                <span>Laboratorio Estratégico</span>
                <button className="btn" onClick={() => setShowLab((prev) => !prev)}>
                  {showLab ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {showLab ? (
                <Lab />
              ) : (
                <div className="AppUI-dashboardHidden">Lab oculto.</div>
              )}
              <Alerts />
            </div>
          </div>
          <TodoCounter completed={completedTodos} total={totalTodos} />
          <TodoSearch
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterPriority={filterPriority}
            setFilterPriority={setFilterPriority}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onClearCompleted={clearCompletedTodos}
            onToggleAll={toggleAllTodos}
            totalTodos={totalTodos}
            completedTodos={completedTodos}
          />

          <TodoList>
            {loading && (
              <>
                <TodosLoading />
                <TodosLoading />
                <TodosLoading />
                <TodosLoading />
                <TodosLoading />
                <TodosLoading />
              </>
            )}

            {error && <TodosError />}

            {!loading && searchedTodos.length === 0 && <EmptyTodos />}

            {!loading &&
              !error &&
              searchedTodos.map((todo) => (
                <TodoItem
                  key={todo.id || todo.text}
                  id={todo.id}
                  text={todo.text}
                  completed={todo.completed}
                  priority={todo.priority}
                  category={todo.category}
                  dueDate={todo.dueDate}
                  onComplete={() => completeTodo(todo.id)}
                  onDelete={() => deleteTodo(todo.id)}
                  onPriorityChange={(newPriority) => updateTodoPriority(todo.id, newPriority)}
                  onEdit={(newText) => editTodo(todo.id, newText)}
                />
              ))}
          </TodoList>

          <CreateTodoButton />
          {openModal && (
            <Modal>
              <TodoForm />
            </Modal>
          )}
        </>
      )}
    </TodoContext.Consumer>
  );
}

export { AppUI };
