import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCachedAddressResults,
  searchAddresses,
  type AddressStop
} from '../lib/places/address-search';

export type AddressSearchStatus = 'idle' | 'loading' | 'done' | 'error' | 'offline';

const AUTO_LOOKUP_DEBOUNCE_MS = 650;
const MIN_QUERY_LEN = 3;
const MIN_AUTO_LEN = 4;

export function useAddressSearch(
  query: string,
  hasStopMatches: boolean,
  isCoordinate: boolean
) {
  const [addresses, setAddresses] = useState<AddressStop[]>([]);
  const [status, setStatus] = useState<AddressSearchStatus>('idle');
  const [searchedQuery, setSearchedQuery] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  const runSearch = useCallback(async (rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (trimmed.length < MIN_QUERY_LEN) return;

    const cached = getCachedAddressResults(trimmed);
    if (cached) {
      abortRef.current?.abort();
      setAddresses(cached);
      setSearchedQuery(trimmed);
      setStatus('done');
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setAddresses([]);
      setSearchedQuery(trimmed);
      setStatus('offline');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;

    setStatus('loading');
    setSearchedQuery(trimmed);

    try {
      const results = await searchAddresses(trimmed, controller.signal);
      if (seq !== seqRef.current || controller.signal.aborted) return;
      setAddresses(results);
      setStatus('done');
    } catch (err) {
      if (controller.signal.aborted || seq !== seqRef.current) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setStatus('offline');
      } else {
        setStatus('error');
      }
      setAddresses([]);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LEN || isCoordinate) {
      abortRef.current?.abort();
      seqRef.current++;
      setAddresses([]);
      setSearchedQuery('');
      setStatus('idle');
      return;
    }

    const cached = getCachedAddressResults(trimmed);
    if (cached) {
      abortRef.current?.abort();
      seqRef.current++;
      setAddresses(cached);
      setSearchedQuery(trimmed);
      setStatus('done');
      return;
    }

    // Only auto-lookup when no transit stops matched (to avoid hitting Photon on every stop search)
    if (hasStopMatches || trimmed.length < MIN_AUTO_LEN) {
      abortRef.current?.abort();
      seqRef.current++;
      setAddresses([]);
      setSearchedQuery('');
      setStatus('idle');
      return;
    }

    const timer = window.setTimeout(() => {
      void runSearch(trimmed);
    }, AUTO_LOOKUP_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, hasStopMatches, isCoordinate, runSearch]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const searchNow = useCallback(() => {
    void runSearch(query);
  }, [query, runSearch]);

  return {
    addresses,
    status,
    searchedQuery,
    searchNow
  };
}
