import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a fast-changing value.
 * Useful for delaying search API calls until the user stops typing.
 *
 * @param {any} value - The value to debounce (e.g., search term string)
 * @param {number} delay - How many milliseconds to wait after the last change
 * @returns {any} - The debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes (also on delay change or unmount)
    // This is how we prevent debounced value from updating if value is changed ...
    // ... within the delay period. Timeout gets cleared and restarted.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
