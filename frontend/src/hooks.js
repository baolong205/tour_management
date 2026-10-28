import { useEffect, useState } from 'react';
import { api } from './services/api.js';

export function useApi(path, revision = 0) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  useEffect(() => {
    if (!path) { setState({ data: null, loading: false, error: '' }); return; }
    const controller = new AbortController();
    setState({ data: null, loading: true, error: '' });
    api(path, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setState({ data, loading: false, error: '' }); }).catch(error => { if (!controller.signal.aborted) setState({ data: null, loading: false, error: error.message }); });
    return () => controller.abort();
  }, [path, revision]);
  return state;
}