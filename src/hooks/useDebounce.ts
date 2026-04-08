import { useEffect, useState } from 'react';

/**
 * Hook trả về giá trị sau khi delay nhất định.
 * Dùng để debounce input search tránh gọi API mỗi keystroke.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
