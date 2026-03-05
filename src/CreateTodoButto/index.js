import './CreateTodoButton.css';
function CreateTodoButton() {
  return (
    <button 
    className="CreateTodoButton" 
    onClick={
      (event) => { 
        console.log('seleccionaste el botón de crear tarea');
        console.log(event);
        console.log(event.target);
      }
    }
      >+</button>
  );
}

export {CreateTodoButton};
