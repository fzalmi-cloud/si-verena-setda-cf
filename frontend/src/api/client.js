const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok && response.status !== 202) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(data) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  me() {
    return this.request('/api/auth/me');
  }

  // Generic CRUD
  list(entity, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/${entity}${query ? `?${query}` : ''}`);
  }

  get(entity, id) {
    return this.request(`/api/${entity}/${id}`);
  }

  create(entity, data) {
    return this.request(`/api/${entity}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  update(entity, id, data) {
    return this.request(`/api/${entity}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(entity, id) {
    return this.request(`/api/${entity}/${id}`, {
      method: 'DELETE',
    });
  }

  // Bulk operations
  bulkCreate(entity, items) {
    return this.request(`/api/${entity}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  // Bulk delete (POST /api/:entity/bulk-delete dengan daftar id)
  bulkDelete(entity, ids) {
    return this.request(`/api/${entity}/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  // Bulk update (PUT /api/:entity/bulk dengan ids + data)
  bulkUpdate(entity, ids, data) {
    return this.request(`/api/${entity}/bulk`, {
      method: 'PUT',
      body: JSON.stringify({ ids, data }),
    });
  }

  // LLM
  generateLLM(prompt, options = {}) {
    return this.request('/api/llm/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, ...options }),
    });
  }

  // File upload
  async upload(file, folder = 'dokumen') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Sesi berakhir. Silakan login kembali.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  // Multiple file upload
  async uploadMultiple(files, folder = 'dokumen') {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    formData.append('folder', folder);

    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}/api/upload/multiple`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Sesi berakhir. Silakan login kembali.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }
}

export const api = new ApiClient();
