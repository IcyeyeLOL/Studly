/**
 * API client for Studly backend.
 * Used when backend is reachable. Falls back to solveDirect.js when not.
 */

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const DEFAULT_HEADERS = {
  'Bypass-Tunnel-Reminder': 'true',
  'User-Agent': 'Studly/1.0',
};

export async function healthCheck() {
  const res = await fetch(`${API_URL}/api/health`, {
    method: 'GET',
    headers: DEFAULT_HEADERS,
  });
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  const data = await res.json();
  if (!data?.ok) throw new Error('Health check returned unexpected response');
  return { ...data, _baseUrl: API_URL };
}

export async function solve({ question, subject, output_preference, attachment_urls, token, baseUrl }) {
  const url = (baseUrl || API_URL) + '/api/solve';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...DEFAULT_HEADERS,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      question: String(question).trim(),
      subject: subject || 'Other',
      output_preference: output_preference || 'handwritten',
      attachment_urls: attachment_urls || [],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `Request failed (${res.status})`;
    try {
      const json = JSON.parse(errBody);
      if (json.error) msg = json.error;
    } catch (_) {}
    throw new Error(msg);
  }

  return res.json();
}

/**
 * Streaming solve via backend: POST to /api/solve/stream, read NDJSON lines incrementally.
 * Uses XMLHttpRequest for React Native compatibility.
 */
export function solveStream(
  { question, subject, output_preference, attachment_urls, token, baseUrl },
  { onChunk, onDone, onError }
) {
  const url = (baseUrl || API_URL) + '/api/solve/stream';
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    Object.entries(DEFAULT_HEADERS).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    let lastIndex = 0;

    xhr.onreadystatechange = () => {
      if (xhr.readyState >= 3 && xhr.responseText) {
        const newData = xhr.responseText.substring(lastIndex);
        lastIndex = xhr.responseText.length;
        const lines = newData.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.error) {
              onError?.(new Error(data.error));
              return;
            }
            if (data.t != null) onChunk?.(data.t);
            if (data.done === true && data.answerText != null) {
              onDone?.({
                question: data.question ?? question,
                subject: data.subject ?? subject,
                answerText: data.answerText,
                outputPreference: data.outputPreference ?? output_preference,
              });
            }
          } catch (_) {}
        }
      }

      if (xhr.readyState === 4) {
        if (xhr.status < 200 || xhr.status >= 300) {
          let msg = `Request failed (${xhr.status})`;
          try {
            const json = JSON.parse(xhr.responseText);
            if (json.error) msg = json.error;
          } catch (_) {}
          onError?.(new Error(msg));
        }
        resolve();
      }
    };

    xhr.onerror = () => {
      onError?.(new Error('Network error'));
      resolve();
    };

    xhr.send(JSON.stringify({
      question: String(question).trim(),
      subject: subject || 'Other',
      output_preference: output_preference || 'handwritten',
      attachment_urls: attachment_urls || [],
    }));
  });
}
