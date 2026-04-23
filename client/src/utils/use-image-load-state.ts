import { useEffect, useRef, useState } from "react";

export function useImageLoadState(src?: string) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const image = imageRef.current;
    if (src && image && image.complete) {
      if (image.naturalWidth > 0) {
        setLoaded(true);
        setFailed(false);
      } else {
        setLoaded(false);
        setFailed(true);
      }
      return;
    }

    setLoaded(false);
    setFailed(false);
  }, [src]);

  return {
    failed,
    imageRef,
    loaded,
    onError: () => {
      setLoaded(false);
      setFailed(true);
    },
    onLoad: () => {
      setLoaded(true);
      setFailed(false);
    },
  };
}
