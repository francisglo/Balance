import React from 'react';

function useLocalStorage(itemName, initialValue) {
  const initialValueRef = React.useRef(initialValue);
  const [item, setItem] = React.useState(initialValue);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    setTimeout(() => {
      try {
        const localStorageItem = localStorage.getItem(itemName);

        if (!localStorageItem) {
          localStorage.setItem(itemName, JSON.stringify(initialValueRef.current));
          setItem(initialValueRef.current);
        } else {
          const parsedItem = JSON.parse(localStorageItem);
          setItem(parsedItem);
        }

        setLoading(false);
      } catch (error) {
        setError(true);
        setLoading(false);
      }
    }, 1000); // Simula carga
  }, [itemName]);

  const saveItem = (newItem) => {
    try {
      localStorage.setItem(itemName, JSON.stringify(newItem));
      setItem(newItem);
    } catch (err) {
      setError(true);
    }
  };

  return {
    item,
    saveItem,
    loading,
    error,
  };
}

export { useLocalStorage };

