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

export const getPortalState = async (key) => request('/portal/state?key=' + encodeURIComponent(key));

export const putPortalState = async (key, value) => request('/portal/state?key=' + encodeURIComponent(key), {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ value }),
});

export const listPortalDocuments = async () => request('/portal/documents');

export const uploadPortalDocument = async (payload) => {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('title', payload.title || payload.file?.name || 'Document');
  formData.append('category', payload.category || 'other');
  formData.append('tags', JSON.stringify(payload.tags || []));
  formData.append('note', payload.note || '');
  formData.append('referenceDate', payload.referenceDate || '');
  formData.append('familyPersonId', payload.familyPersonId || '');

  return request('/portal/documents', {
    method: 'POST',
    body: formData,
  });
};

export const deletePortalDocument = async (id) => request('/portal/documents/' + String(id), {
  method: 'DELETE',
});

export const getPortalDocumentDownloadUrl = (id) => API_BASE_URL + '/portal/documents/' + String(id) + '/download';
