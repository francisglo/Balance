import { HiArchiveBoxXMark } from "react-icons/hi2";
import { TodoIcon } from ".";

function DeleteIcon({ onClick }) {
  return (
    <TodoIcon type="delete" onClick={onClick}>
      <HiArchiveBoxXMark size={22} />
    </TodoIcon>
  );
}

export { DeleteIcon };

