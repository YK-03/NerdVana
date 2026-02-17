import { useEffect, useState } from "react";

export function useProgressiveReveal(count: number) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (count <= 0) {
      setVisibleCount(0);
      return;
    }

    setVisibleCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setVisibleCount(i);
      if (i >= count) {
        clearInterval(interval);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [count]);

  return visibleCount;
}
