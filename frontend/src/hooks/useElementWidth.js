import { useEffect, useRef, useState } from "react";

// Charts render at real pixel widths rather than stretching a viewBox, so stroke
// weights stay true. This tracks the container width.
export default function useElementWidth(initialWidth = 640) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect?.width;
      if (next) setWidth(next);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
