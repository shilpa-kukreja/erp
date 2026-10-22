const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let refreshPromise = null;

async function tryRefresh() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function request(path, options = {}, retry = true) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (res.status === 401 && retry && !path.startsWith('/api/auth/refresh') && !path.startsWith('/api/auth/login')) {
    const ok = await tryRefresh();
    if (ok) return request(path, options, false);
  }

  let body = null;
  try { body = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error(body?.message || `Request failed: ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export const api = {
  get: (p) => request(p, { method: 'GET' }),

  post: (p, data) =>
    request(p, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: (p, data) =>
    request(p, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  // NEW: Delete request
  del: (p) =>
    request(p, { method: 'DELETE' }),
};

export const authApi = {
  status: () => api.get('/api/auth/status'),
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  refresh: () => api.post('/api/auth/refresh'),
};

export const usersApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
    ).toString();
    return api.get(`/api/users${qs ? `?${qs}` : ''}`);
  },
  get: (id) => api.get(`/api/users/${id}`),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.patch(`/api/users/${id}`, data),
  resetPassword: (id, newPassword) => api.post(`/api/users/${id}/reset-password`, { newPassword }),
};





const qsFrom = (params = {}) =>
  new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  ).toString();

export const masterdataApi = {
  units: {
    list: (p = {}) => {
      const qs = qsFrom(p);
      return api.get(
        `/api/masterdata/units${qs ? `?${qs}` : ''}`
      );
    },
    create: (data) => api.post('/api/masterdata/units', data),
    update: (id, data) =>
      api.patch(`/api/masterdata/units/${id}`, data),
    delete: (id) => api.del(`/api/masterdata/units/${id}`),
  },

  godowns: {
    list: (p = {}) => {
      const qs = qsFrom(p);
      return api.get(
        `/api/masterdata/godowns${qs ? `?${qs}` : ''}`
      );
    },
    create: (data) => api.post('/api/masterdata/godowns', data),
    update: (id, data) =>
      api.patch(`/api/masterdata/godowns/${id}`, data),
    delete: (id) => api.del(`/api/masterdata/godowns/${id}`),
  },

  products: {
    list: (p = {}) => {
      const qs = qsFrom(p);
      return api.get(
        `/api/masterdata/products${qs ? `?${qs}` : ''}`
      );
    },
    get: (id) => api.get(`/api/masterdata/products/${id}`),
    create: (data) => api.post('/api/masterdata/products', data),
    update: (id, data) =>
      api.patch(`/api/masterdata/products/${id}`, data),
    delete: (id) => api.del(`/api/masterdata/products/${id}`),
  },

  parties: {
    list: (p = {}) => {
      const qs = qsFrom(p);
      return api.get(
        `/api/masterdata/parties${qs ? `?${qs}` : ''}`
      );
    },
    get: (id) => api.get(`/api/masterdata/parties/${id}`),
    create: (data) => api.post('/api/masterdata/parties', data),
    update: (id, data) =>
      api.patch(`/api/masterdata/parties/${id}`, data),
    delete: (id) => api.del(`/api/masterdata/parties/${id}`),

    effectivePrice: (partyId, productId) =>
      api.get(
        `/api/masterdata/parties/${partyId}/effective-price/${productId}`
      ),
  },

  seedDefaults: () =>
    api.post('/api/masterdata/seed-defaults'),
};




export const stockApi = {
  listBalances: (p = {}) => { const qs = qsFrom(p); return api.get(`/api/stock/balance${qs ? `?${qs}` : ''}`); },
  listLedger: (p = {}) => { const qs = qsFrom(p); return api.get(`/api/stock/ledger${qs ? `?${qs}` : ''}`); },
  listReservations: (p = {}) => { const qs = qsFrom(p); return api.get(`/api/stock/reservations${qs ? `?${qs}` : ''}`); },
  adjust: (data) => api.post('/api/stock/adjust', data),
  transfer: (data) => api.post('/api/stock/transfer', data),
  reserve: (data) => api.post('/api/stock/reserve', data),
  release: (orderId) => api.post('/api/stock/release', { orderId }),
  consume: (orderId) => api.post('/api/stock/consume', { orderId }),
};




export const purchaseApi = {
  list: (p = {}) => { const qs = qsFrom(p); return api.get(`/api/purchase${qs ? `?${qs}` : ''}`); },
  get: (id) => api.get(`/api/purchase/${id}`),
  create: (data) => api.post('/api/purchase', data),
  confirm: (id) => api.post(`/api/purchase/${id}/confirm`),
};