import { FcElectricity } from "react-icons/fc";
import { TodoIcon } from ".";

function CompleteIcon({ completed, onClick }) {
  return (
    <TodoIcon
      type="check"
      completed={completed}
      onClick={onClick}
      color={completed ? "#4caf50" : "#aaa"}
    >
      <FcElectricity size={20} />
    </TodoIcon>
  );
}

export { CompleteIcon };


