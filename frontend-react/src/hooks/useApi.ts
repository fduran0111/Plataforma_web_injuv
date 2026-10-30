"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type State<T> = { data: T | undefined; error: string | null; loading: boolean };

/**
 * Carga un recurso GET de la API. `path = null` desactiva la petición (p. ej. mientras no hay sesión).
 * `reload()` vuelve a pedirlo; `setData` permite actualizaciones optimistas.
 */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ data: undefined, error: null, loading: path !== null });
  const current = useRef(path);

  const load = useCallback(async () => {
    if (path === null) return;
    current.current = path;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await apiFetch<T>(path);
      if (current.current === path) setState({ data, error: null, loading: false });
    } catch (e) {
      if (current.current === path) setState((s) => ({ ...s, error: (e as Error).message, loading: false }));
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  const setData = useCallback((updater: T | ((prev: T | undefined) => T)) => {
    setState((s) => ({
      ...s,
      data: typeof updater === "function" ? (updater as (prev: T | undefined) => T)(s.data) : updater,
    }));
  }, []);

  return { ...state, reload: load, setData };
}
