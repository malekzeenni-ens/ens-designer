import { useEffect, useRef, useState } from "react";
import type { KeychainRequest, KeychainResult } from "../state/keychainTypes";
import { previewKeychain } from "../services/keychainApi";

export function useKeychainPreview(request: KeychainRequest | null, delay: number, active: boolean) {
  const key = request ? JSON.stringify(request) : "";
  const seq = useRef(0);
  const [result, setResult] = useState<KeychainResult | null>(null);
  const [resultKey, setResultKey] = useState("");
  const [status, setStatus] = useState<"idle" | "updating" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  useEffect(() => {
    if (!key || !active) return;
    const requestId = ++seq.current;
    const controller = new AbortController();
    let cancelled = false;
    setStatus("updating"); setError(null);
    const timer = setTimeout(() => {
      const payload = { ...JSON.parse(key), request_id: requestId } as KeychainRequest;
      previewKeychain(payload, controller.signal).then(response => {
        if (cancelled || controller.signal.aborted || response.request_id !== seq.current) return;
        setResult(response); setResultKey(key); setStatus("ready");
      }).catch((caught: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "Could not update the keychain preview.");
        setStatus("error");
      });
    }, delay);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [key, delay, active, retryToken]);
  return { result, status, error, current: Boolean(key && resultKey === key && status === "ready"),
    retry: () => setRetryToken(token => token + 1) };
}
