function TodoIcon({ type, color, onClick, completed, children }) {

  const iconTypes = {
    check: "Icon-check",
    delete: "Icon-delete",
  };

  return (
    <span
      className={`
        Icon 
        ${iconTypes[type]} 
        ${completed && type === "check" ? "Icon-check--active" : ""}
      `}
      onClick={onClick}
      style={{ color }}
    >
      {children}
    </span>
  );
}

export { TodoIcon };
