import { useCallback, useEffect, useRef, useState } from 'react';

// Petit hook de chargement : `fetcher` doit renvoyer une promesse de données.
// `deps` déclenche le re-fetch (comme useEffect). Renvoie
// { data, loading, error, reload, setData }.
export function useData(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  const load = useCallback(async (silent = false) => {
    const my = ++seq.current;
    if (!silent) setLoading(true);
    try {
      const d = await fetcher();
      if (seq.current === my) { setData(d); setError(null); }
    } catch (e) {
      if (seq.current === my) setError(e);
    } finally {
      if (seq.current === my) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load, setData };
}
