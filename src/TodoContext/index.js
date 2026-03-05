import React from 'react';
import { useLocalStorage } from '../App/useLocalStorage';


const TodoContext = React.createContext();

function TodoProvider({ children }) {
  const {
    item: todos,
    saveItem: saveTodos,
    loading,
    error,
  } = useLocalStorage('TODOS_V1', []);

  const [searchValue, setSearchValue] = React.useState('');
  const [openModal, setOpenModal] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [filterPriority, setFilterPriority] = React.useState('all');
  const [filterCategory, setFilterCategory] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('created_desc');

  const completedTodos = todos.filter(todo => todo.completed).length;
  const totalTodos = todos.length;

  const getPriorityOrder = (priority) => {
    const order = { alta: 1, media: 2, baja: 3 };
    return order[priority] || 2;
  };
  
  const searchedTodos = todos
    .filter(todo => {
      const todoText = todo.text.toLowerCase();
      const searchText = searchValue.toLowerCase();
      return todoText.includes(searchText);
    })
    .filter(todo => {
      if (filterStatus === 'completed') return todo.completed;
      if (filterStatus === 'pending') return !todo.completed;
      return true;
    })
    .filter(todo => (filterPriority === 'all' ? true : (todo.priority || 'media') === filterPriority))
    .filter(todo => (filterCategory === 'all' ? true : (todo.category || 'personal') === filterCategory))
    .sort((a, b) => {
      if (sortBy === 'priority') {
        return getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
      }
      if (sortBy === 'due_asc') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'created_asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const completeTodo = (id) => {
    const newTodos = [...todos];
    const todoIndex = newTodos.findIndex(todo => todo.id === id);

    if (todoIndex >= 0) {
      newTodos[todoIndex].completed = !newTodos[todoIndex].completed;
      newTodos[todoIndex].completedAt = newTodos[todoIndex].completed ? new Date().toISOString() : null;
      saveTodos(newTodos);
    }
  };

  const deleteTodo = (id) => {
    const newTodos = [...todos];
    const todoIndex = newTodos.findIndex(todo => todo.id === id);

    if (todoIndex >= 0) {
      newTodos.splice(todoIndex, 1);
      saveTodos(newTodos);
    }
  };

  const addTodo = (text, priority = 'media', dueDate = null, category = 'personal') => {
    const newTodos = [...todos];
    newTodos.push({
      id: Date.now(),
      text,
      completed: false,
      priority,
      dueDate,
      category,
      createdAt: new Date().toISOString(),
      completedAt: null,
    });
    saveTodos(newTodos);
  };

  const updateTodoPriority = (id, newPriority) => {
    const newTodos = [...todos];
    const todoIndex = newTodos.findIndex(todo => todo.id === id);
    if (todoIndex >= 0) {
      newTodos[todoIndex].priority = newPriority;
      saveTodos(newTodos);
    }
  };

  const editTodo = (id, newText) => {
    const nextText = newText.trim();
    if (!nextText) return;

    const newTodos = [...todos];
    const todoIndex = newTodos.findIndex(todo => todo.id === id);
    if (todoIndex >= 0) {
      newTodos[todoIndex].text = nextText;
      saveTodos(newTodos);
    }
  };

  const clearCompletedTodos = () => {
    const pendingTodos = todos.filter(todo => !todo.completed);
    saveTodos(pendingTodos);
  };

  const toggleAllTodos = () => {
    const shouldCompleteAll = todos.some(todo => !todo.completed);
    const nextTodos = todos.map(todo => ({
      ...todo,
      completed: shouldCompleteAll,
      completedAt: shouldCompleteAll ? (todo.completedAt || new Date().toISOString()) : null,
    }));
    saveTodos(nextTodos);
  };

  const getProductivityMetrics = () => {
    const completedCount = todos.filter(t => t.completed).length;
    const productivity = totalTodos > 0 ? Math.round((completedCount / totalTodos) * 100) : 0;
    return { productivity, completedCount };
  };


    return (
        <TodoContext.Provider value={{
          loading,
          error,
          completedTodos,
          totalTodos,
          searchValue,
          setSearchValue,
          searchedTodos,
          completeTodo,
          deleteTodo,
          addTodo,
          updateTodoPriority,
          editTodo,
          clearCompletedTodos,
          toggleAllTodos,
          filterStatus,
          setFilterStatus,
          filterPriority,
          setFilterPriority,
          filterCategory,
          setFilterCategory,
          sortBy,
          setSortBy,
          getProductivityMetrics,
          openModal,
          setOpenModal,
          todos,
        }} >
            {children}  
        </TodoContext.Provider>
    ); 
}

export { TodoContext, TodoProvider };