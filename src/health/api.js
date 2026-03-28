const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

const request = async (path, options = {}) => {
  const response = await fetch(API_BASE_URL + path, options);
  const data = await parseResponse(response);

  if (!response.ok) {
    const message = typeof data === 'object' && data != null
      ? data.details || data.error || response.statusText
      : String(data || response.statusText);
    const error = new Error(message);
    error.response = { data };
    throw error;
  }

  return data;
};

export const login = async (username, password) => request('/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
});

export const uploadFiles = async (files, onProgress) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const response = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE_URL + '/upload');
    xhr.responseType = 'json';
    xhr.timeout = 600000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    };

    xhr.onload = () => {
      const payload = xhr.response || JSON.parse(xhr.responseText || '{}');
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
        return;
      }
      const error = new Error(payload?.details || payload?.error || 'Upload failed');
      error.response = { data: payload };
      reject(error);
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out'));
    };

    xhr.send(formData);
  });

  return response;
};

export const getHealthData = async () => request('/data');

export const deleteRecord = async (id) => request('/data/' + String(id), {
  method: 'DELETE',
});

export const getDeepAnalysis = async (metrics, medicalHistory, ecgHistory, cdaHistory, dailyNote, timeline, bodyMeasurements) => request('/ai/coach', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ metrics, medicalHistory, ecgHistory, cdaHistory, dailyNote, timeline, bodyMeasurements }),
});

export const deleteBulk = async (ids) => request('/data/delete-bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ids }),
});

export const getDailyNotes = async (limit = 30) => request('/notes?limit=' + String(limit));

export const createDailyNote = async (text) => request('/notes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text }),
});

export const getTimeline = async (limit = 50) => request('/timeline?limit=' + String(limit));

export const createTimelineEntry = async (payload) => request('/timeline', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export const exportJsonBackupUrl = () => API_BASE_URL + '/export/json';

export const exportCsvBackupUrl = (table) => API_BASE_URL + '/export/csv?table=' + encodeURIComponent(table);

export const askCoach = async ({ question, metrics, medicalHistory, ecgHistory, cdaHistory, dailyNotes, timeline, bodyMeasurements }) => request('/ai/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question,
    metrics,
    medicalHistory,
    ecgHistory,
    cdaHistory,
    dailyNotes,
    timeline,
    bodyMeasurements,
  }),
});

export const getMeasurements = async (limit = 50) => request('/measurements?limit=' + String(limit));

export const createMeasurementEntry = async (payload) => request('/measurements', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
