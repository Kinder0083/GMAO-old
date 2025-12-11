import axios from 'axios';
import { BACKEND_URL } from '../utils/config';

const API_BASE = `${BACKEND_URL}/api`;

// Axios instance avec intercepteurs
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  validateInvitation: (token) => api.get(`/auth/validate-invitation/${token}`),
  completeRegistration: (data) => api.post('/auth/complete-registration', data),
  changePasswordFirstLogin: (data) => api.post('/auth/change-password-first-login', data)
};

// ==================== WORK ORDERS ====================
export const workOrdersAPI = {
  getAll: (params) => api.get('/work-orders', { params }),
  getById: (id) => api.get(`/work-orders/${id}`),
  create: (data) => api.post('/work-orders', data),
  update: (id, data) => api.put(`/work-orders/${id}`, data),
  delete: (id) => api.delete(`/work-orders/${id}`),
  
  // Add time spent
  addTimeSpent: (workOrderId, hours, minutes) => 
    api.post(`/work-orders/${workOrderId}/add-time`, { hours, minutes }),
  
  // Attachments
  uploadAttachment: (workOrderId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/work-orders/${workOrderId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getAttachments: (workOrderId) => api.get(`/work-orders/${workOrderId}/attachments`),
  downloadAttachment: (workOrderId, attachmentId) => {
    return api.get(`/work-orders/${workOrderId}/attachments/${attachmentId}`, {
      responseType: 'blob'
    });
  },
  deleteAttachment: (workOrderId, attachmentId) => {
    return api.delete(`/work-orders/${workOrderId}/attachments/${attachmentId}`);
  },
  
  // Parts used
  addWorkOrderParts: async (workOrderId, parts) => {
    const response = await api.post(`/work-orders/${workOrderId}/parts-used`, parts);
    return response.data;
  }
};

// ==================== EQUIPMENTS ====================
export const equipmentsAPI = {
  getAll: () => api.get('/equipments'),
  getById: (id) => api.get(`/equipments/${id}`),
  create: (data) => api.post('/equipments', data),
  update: (id, data) => api.put(`/equipments/${id}`, data),
  delete: (id) => api.delete(`/equipments/${id}`),
  getChildren: (id) => api.get(`/equipments/${id}/children`),
  getHierarchy: (id) => api.get(`/equipments/${id}/hierarchy`),
  updateStatus: (id, statut) => api.patch(`/equipments/${id}/status`, null, { params: { statut } })
};

// ==================== LOCATIONS ====================
export const locationsAPI = {
  getAll: () => api.get('/locations'),
  getById: (id) => api.get(`/locations/${id}`),
  create: (data) => api.post('/locations', data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`)
};

// ==================== INVENTORY ====================
export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getById: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`)
};

// ==================== PREVENTIVE MAINTENANCE ====================
export const preventiveMaintenanceAPI = {
  getAll: () => api.get('/preventive-maintenance'),
  getById: (id) => api.get(`/preventive-maintenance/${id}`),
  create: (data) => api.post('/preventive-maintenance', data),
  update: (id, data) => api.put(`/preventive-maintenance/${id}`, data),
  delete: (id) => api.delete(`/preventive-maintenance/${id}`)
};

// ==================== USERS ====================
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  invite: (data) => api.post('/users/invite', data),
  inviteMember: (data) => api.post('/users/invite-member', data),
  createMember: (data) => api.post('/users/create-member', data),
  getPermissions: (id) => api.get(`/users/${id}/permissions`),
  updatePermissions: (id, permissions) => api.put(`/users/${id}/permissions`, permissions),
  getDefaultPermissionsByRole: (role) => api.get(`/users/default-permissions/${role}`),
  setPasswordPermanent: (userId) => api.post(`/users/${userId}/set-password-permanent`),
  resetPasswordByAdmin: (userId) => api.post(`/users/${userId}/reset-password-admin`)
};

// ==================== VENDORS ====================
export const vendorsAPI = {
  getAll: () => api.get('/vendors'),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`)
};

// ==================== PURCHASE HISTORY ====================
export const purchaseHistoryAPI = {
  getAll: () => api.get('/purchase-history'),
  getGrouped: () => api.get('/purchase-history/grouped'),
  getStats: () => api.get('/purchase-history/stats'),
  downloadTemplate: (format = 'csv') => 
    api.get('/purchase-history/template', {
      params: { format },
      responseType: 'blob'
    }),
  deleteAll: () => api.delete('/purchase-history/all'),
  create: (data) => api.post('/purchase-history', data),
  update: (id, data) => api.put(`/purchase-history/${id}`, data),
  delete: (id) => api.delete(`/purchase-history/${id}`)
};

// ==================== REPORTS ====================
export const reportsAPI = {
  getAnalytics: () => api.get('/reports/analytics'),
  getTimeByCategory: (startMonth) => api.get('/reports/time-by-category', { params: { start_month: startMonth } })
};

// ==================== IMPORT/EXPORT ====================
export const importExportAPI = {
  exportData: (module, format = 'xlsx') => 
    api.get(`/export/${module}`, { 
      params: { format },
      responseType: 'blob' 
    }),
  importData: (module, file, mode = 'add') => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/import/${module}`, formData, {
      params: { mode },
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// ==================== AUDIT LOGS (JOURNAL) ====================
export const auditAPI = {
  getAuditLogs: async (params) => {
    const response = await api.get('/audit-logs', { params });
    return response.data;
  },
  getEntityHistory: async (entityType, entityId) => {
    const response = await api.get(`/audit-logs/entity/${entityType}/${entityId}`);
    return response.data;
  },
  exportAuditLogs: async (params) => {
    const response = await api.get('/audit-logs/export', {
      params,
      responseType: 'blob'
    });
    
    // Créer un lien de téléchargement
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_logs_${new Date().getTime()}.${params.format || 'csv'}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return response;
  }
};

// ==================== WORK ORDER COMMENTS ====================
export const commentsAPI = {
  addWorkOrderComment: async (workOrderId, data) => {
    // Accepte soit un string (ancien format) soit un objet (nouveau format avec parts_used)
    const payload = typeof data === 'string' ? { text: data, parts_used: [] } : data;
    const response = await api.post(`/work-orders/${workOrderId}/comments`, payload);
    return response.data;
  },
  getWorkOrderComments: async (workOrderId) => {
    const response = await api.get(`/work-orders/${workOrderId}/comments`);
    return response.data;
  }
};

// ==================== METERS (COMPTEURS) ====================
export const metersAPI = {
  getAll: () => api.get('/meters'),
  getById: (id) => api.get(`/meters/${id}`),
  create: (data) => api.post('/meters', data),
  update: (id, data) => api.put(`/meters/${id}`, data),
  delete: (id) => api.delete(`/meters/${id}`),
  
  // Readings (Relevés)
  getReadings: (meterId, params) => api.get(`/meters/${meterId}/readings`, { params }),
  createReading: (meterId, data) => api.post(`/meters/${meterId}/readings`, data),
  deleteReading: (readingId) => api.delete(`/readings/${readingId}`),
  getStatistics: (meterId, period = 'month') => api.get(`/meters/${meterId}/statistics`, { params: { period } })
};

// ==================== INTERVENTION REQUESTS (DEMANDES D'INTERVENTION) ====================
export const interventionRequestsAPI = {
  getAll: () => api.get('/intervention-requests'),
  getById: (id) => api.get(`/intervention-requests/${id}`),
  create: (data) => api.post('/intervention-requests', data),
  update: (id, data) => api.put(`/intervention-requests/${id}`, data),
  delete: (id) => api.delete(`/intervention-requests/${id}`),
  convertToWorkOrder: (id, assigneeId, dateLimite) => api.post(`/intervention-requests/${id}/convert-to-work-order`, null, { 
    params: { 
      assignee_id: assigneeId,
      date_limite: dateLimite
    } 
  })
};

// ==================== IMPROVEMENT REQUESTS (DEMANDES D'AMÉLIORATION) ====================
export const improvementRequestsAPI = {
  getAll: () => api.get('/improvement-requests'),
  getById: (id) => api.get(`/improvement-requests/${id}`),
  create: (data) => api.post('/improvement-requests', data),
  update: (id, data) => api.put(`/improvement-requests/${id}`, data),
  delete: (id) => api.delete(`/improvement-requests/${id}`),
  convertToImprovement: (id, assigneeId, dateLimite) => api.post(`/improvement-requests/${id}/convert-to-improvement`, null, { 
    params: { 
      assignee_id: assigneeId,
      date_limite: dateLimite
    } 
  }),
  
  // Attachments
  uploadAttachment: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/improvement-requests/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  downloadAttachment: (id, filename) => api.get(`/improvement-requests/${id}/attachments/${filename}`, {
    responseType: 'blob'
  }),
  
  // Comments
  addComment: (id, text) => api.post(`/improvement-requests/${id}/comments`, { text }),
  getComments: (id) => api.get(`/improvement-requests/${id}/comments`)
};

// ==================== IMPROVEMENTS (AMÉLIORATIONS) ====================
export const improvementsAPI = {
  getAll: (params) => api.get('/improvements', { params }),
  getById: (id) => api.get(`/improvements/${id}`),
  create: (data) => api.post('/improvements', data),
  update: (id, data) => api.put(`/improvements/${id}`, data),
  delete: (id) => api.delete(`/improvements/${id}`),
  
  // Add time spent
  addTimeSpent: (improvementId, hours, minutes) => 
    api.post(`/improvements/${improvementId}/add-time`, { hours, minutes }),
  
  // Attachments
  uploadAttachment: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/improvements/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  downloadAttachment: (id, filename) => api.get(`/improvements/${id}/attachments/${filename}`, {
    responseType: 'blob'
  }),
  
  // Comments
  addComment: (id, text) => api.post(`/improvements/${id}/comments`, { text }),
  getComments: (id) => api.get(`/improvements/${id}/comments`)
};

// System Settings API
api.settings = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data)
};

// ==================== SURVEILLANCE ====================
export const surveillanceAPI = {
  // CRUD
  getItems: (params) => api.get('/surveillance/items', { params }).then(res => res.data),
  getItem: (id) => api.get(`/surveillance/items/${id}`).then(res => res.data),
  createItem: (data) => api.post('/surveillance/items', data).then(res => res.data),
  updateItem: (id, data) => api.put(`/surveillance/items/${id}`, data).then(res => res.data),
  deleteItem: (id) => api.delete(`/surveillance/items/${id}`).then(res => res.data),
  
  // Upload
  uploadFile: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/surveillance/items/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  
  // Stats et alertes
  getStats: () => api.get('/surveillance/stats').then(res => res.data),
  getAlerts: () => api.get('/surveillance/alerts').then(res => res.data),
  getBadgeStats: () => api.get('/surveillance/badge-stats').then(res => res.data),
  getRapportStats: () => api.get('/surveillance/rapport-stats').then(res => res.data),
  
  // Vérification automatique des échéances
  checkDueDates: () => api.post('/surveillance/check-due-dates').then(res => res.data),
  
  // Import/Export
  importData: (formData) => api.post('/surveillance/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  
  exportTemplate: () => api.get('/surveillance/export/template', {
    responseType: 'blob'
  }).then(res => res.data)
};

// ==================== PRESQU'ACCIDENT ====================
export const presquAccidentAPI = {
  // CRUD
  getItems: (params) => api.get('/presqu-accident/items', { params }).then(res => res.data),
  getItem: (id) => api.get(`/presqu-accident/items/${id}`).then(res => res.data),
  createItem: (data) => api.post('/presqu-accident/items', data).then(res => res.data),
  updateItem: (id, data) => api.put(`/presqu-accident/items/${id}`, data).then(res => res.data),
  deleteItem: (id) => api.delete(`/presqu-accident/items/${id}`).then(res => res.data),
  
  // Upload
  uploadFile: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/presqu-accident/items/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  
  // Stats et alertes
  getStats: () => api.get('/presqu-accident/stats').then(res => res.data),
  getAlerts: () => api.get('/presqu-accident/alerts').then(res => res.data),
  getBadgeStats: () => api.get('/presqu-accident/badge-stats').then(res => res.data),
  getRapportStats: () => api.get('/presqu-accident/rapport-stats').then(res => res.data),
  
  // Import/Export
  importData: (formData) => api.post('/presqu-accident/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  
  exportTemplate: () => api.get('/presqu-accident/export/template', {
    responseType: 'blob'
  }).then(res => res.data)
};

// ==================== DOCUMENTATIONS ====================
export const documentationsAPI = {
  // Pôles de Service
  getPoles: () => api.get('/documentations/poles').then(res => res.data),
  getPole: (id) => api.get(`/documentations/poles/${id}`).then(res => res.data),
  createPole: (data) => api.post('/documentations/poles', data).then(res => res.data),
  updatePole: (id, data) => api.put(`/documentations/poles/${id}`, data).then(res => res.data),
  deletePole: (id) => api.delete(`/documentations/poles/${id}`).then(res => res.data),
  
  // Documents
  getDocuments: (params) => api.get('/documentations/documents', { params }).then(res => res.data),
  getDocument: (id) => api.get(`/documentations/documents/${id}`).then(res => res.data),
  createDocument: (data) => api.post('/documentations/documents', data).then(res => res.data),
  updateDocument: (id, data) => api.put(`/documentations/documents/${id}`, data).then(res => res.data),
  deleteDocument: (id) => api.delete(`/documentations/documents/${id}`).then(res => res.data),
  
  // Upload/Download
  uploadFile: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/documentations/documents/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  downloadFile: (id) => api.get(`/documentations/documents/${id}/download`, {
    responseType: 'blob'
  }).then(res => res.data),
  
  // Bons de Travail
  getBonsTravail: (params) => api.get('/documentations/bons-travail', { params }).then(res => res.data),
  getBonTravail: (id) => api.get(`/documentations/bons-travail/${id}`).then(res => res.data),
  createBonTravail: (data) => api.post('/documentations/bons-travail', data).then(res => res.data),
  updateBonTravail: (id, data) => api.put(`/documentations/bons-travail/${id}`, data).then(res => res.data),
  deleteBonTravail: (id) => api.delete(`/documentations/bons-travail/${id}`).then(res => res.data),
  
  // Actions
  generatePDF: (id) => api.post(`/documentations/bons-travail/${id}/pdf`).then(res => res.data),
  sendEmail: (id, email) => api.post(`/documentations/bons-travail/${id}/email`, { email_to: email }).then(res => res.data)
};

// ==================== AUTORISATIONS PARTICULIÈRES ====================
export const autorisationsAPI = {
  getAll: (poleId = null) => {
    const params = poleId ? { pole_id: poleId } : {};
    return api.get('/autorisations/', { params }).then(res => res.data);
  },
  getById: (id) => api.get(`/autorisations/${id}`).then(res => res.data),
  getByBonTravail: (bonTravailId) => api.get(`/autorisations/by-bon-travail/${bonTravailId}`).then(res => res.data),
  create: (data) => api.post('/autorisations/', data).then(res => res.data),
  update: (id, data) => api.put(`/autorisations/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/autorisations/${id}`).then(res => res.data),
  generatePDF: (id) => {
    const token = localStorage.getItem('token');
    return `${API_BASE}/autorisations/${id}/pdf?token=${token}`;
  }
};

// ==================== DEMANDES D'ARRÊT MAINTENANCE ====================
export const demandesArretAPI = {
  getAll: (statut = null) => {
    const params = statut ? { statut } : {};
    return api.get('/demandes-arret/', { params }).then(res => res.data);
  },
  getById: (id) => api.get(`/demandes-arret/${id}`).then(res => res.data),
  create: (data) => api.post('/demandes-arret/', data).then(res => res.data),
  getPlanningEquipements: (params = {}) => api.get('/demandes-arret/planning/equipements', { params }).then(res => res.data)
};

// User Preferences API
export const userPreferencesAPI = {
  getAll: () => api.get('/user-preferences').then(res => res.data),
  get: (key) => api.get(`/user-preferences/${key}`).then(res => res.data),
  set: (key, value) => api.post('/user-preferences', { key, value }).then(res => res.data),
  setBulk: (preferences) => api.put('/user-preferences/bulk', { preferences }).then(res => res.data),
  delete: (key) => api.delete(`/user-preferences/${key}`).then(res => res.data)
};


// Chat Live API
const chatAPI = {
  getMessages: (limit = 50, skip = 0) => api.get(`/chat/messages?limit=${limit}&skip=${skip}`),
  createMessage: (messageData) => api.post('/chat/messages', messageData),
  createMessageWithFiles: (formData) => api.post('/chat/messages-with-files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteMessage: (messageId) => api.delete(`/chat/messages/${messageId}`),
  getUnreadCount: () => api.get('/chat/unread-count'),
  markAsRead: () => api.post('/chat/mark-as-read'),
  getOnlineUsers: () => api.get('/chat/online-users'),
  addReaction: (messageId, emoji) => api.post(`/chat/reactions/${messageId}`, { emoji }),
  uploadFile: (formData) => api.post('/chat/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  downloadFile: (attachmentId) => api.get(`/chat/download/${attachmentId}`, { responseType: 'blob' }),
  transferToWorkOrder: (attachmentId, workorderId) => {
    const formData = new FormData();
    formData.append('attachment_id', attachmentId);
    formData.append('workorder_id', workorderId);
    return api.post('/chat/transfer-to-workorder', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  transferToImprovement: (attachmentId, improvementId) => {
    const formData = new FormData();
    formData.append('attachment_id', attachmentId);
    formData.append('improvement_id', improvementId);
    return api.post('/chat/transfer-to-improvement', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  transferToPreventive: (attachmentId, preventiveId) => {
    const formData = new FormData();
    formData.append('attachment_id', attachmentId);
    formData.append('preventive_id', preventiveId);
    return api.post('/chat/transfer-to-preventive', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  transferToNearMiss: (attachmentId, nearmissId) => {
    const formData = new FormData();
    formData.append('attachment_id', attachmentId);
    formData.append('nearmiss_id', nearmissId);
    return api.post('/chat/transfer-to-nearmiss', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  transferByEmail: (attachmentId, recipientUserIds, message) => {
    const formData = new FormData();
    formData.append('attachment_id', attachmentId);
    formData.append('recipient_user_ids', JSON.stringify(recipientUserIds));
    formData.append('message_text', message || '');
    return api.post('/chat/transfer-by-email', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// Ajouter chatAPI à l'export api
api.chat = chatAPI;

// ==================== MQTT API ====================
const mqttAPI = {
  // Configuration
  getConfig: () => api.get('/mqtt/config'),
  saveConfig: (config) => api.post('/mqtt/config', config),
  
  // Connexion
  connect: () => api.post('/mqtt/connect'),
  disconnect: () => api.post('/mqtt/disconnect'),
  getStatus: () => api.get('/mqtt/status'),
  
  // Publication
  publish: (data) => api.post('/mqtt/publish', data),
  
  // Abonnement
  subscribe: (data) => api.post('/mqtt/subscribe', data),
  unsubscribe: (topicEncoded) => api.delete(`/mqtt/subscribe/${topicEncoded}`),
  getSubscriptions: () => api.get('/mqtt/subscriptions'),
  
  // Messages
  getMessages: (topic = null, limit = 100) => {
    const params = {};
    if (topic) params.topic = topic;
    if (limit) params.limit = limit;
    return api.get('/mqtt/messages', { params });
  },
  clearMessages: () => api.delete('/mqtt/messages')
};

api.mqtt = {
  ...mqttAPI,
  // MQTT Logs
  getLogs: (filters = {}) => api.get('/mqtt/logs/', { params: filters }),
  getLogsStats: (hours = 24) => api.get('/mqtt/logs/stats', { params: { hours } }),
  getLogsTopics: (hours = 24) => api.get('/mqtt/logs/topics', { params: { hours } }),
  clearLogs: (hours = null) => {
    const params = hours ? { hours } : {};
    return api.delete('/mqtt/logs/clear', { params });
  }
};

// ==================== Sensors API ====================
const sensorsAPI = {
  getAll: (type = null) => {
    const params = {};
    if (type) params.type = type;
    return api.get('/sensors', { params });
  },
  getById: (id) => api.get(`/sensors/${id}`),
  create: (data) => api.post('/sensors', data),
  update: (id, data) => api.put(`/sensors/${id}`, data),
  delete: (id) => api.delete(`/sensors/${id}`),
  
  // Readings
  getReadings: (id, limit = 100, hours = 24) => 
    api.get(`/sensors/${id}/readings`, { params: { limit, hours } }),
  getStatistics: (id, hours = 24) => 
    api.get(`/sensors/${id}/statistics`, { params: { hours } }),
  clearReadings: (id) => api.delete(`/sensors/${id}/readings`),
  
  // Templates
  getTemplates: () => api.get('/sensors/templates/list'),
  getTemplate: (templateId) => api.get(`/sensors/templates/${templateId}`),
  
  // Import/Export
  exportJson: () => api.get('/sensors/export/json', { responseType: 'blob' }),
  exportCsv: () => api.get('/sensors/export/csv', { responseType: 'blob' }),
  importJson: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/sensors/import/json', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Groupements
  getGroupsByLocation: () => api.get('/sensors/groups/by-location'),
  getGroupsByType: () => api.get('/sensors/groups/by-type')
};

api.sensors = sensorsAPI;

// ==================== Alerts API ====================
const alertsAPI = {
  getAll: (unreadOnly = false, limit = 50) => 
    api.get('/alerts', { params: { unread_only: unreadOnly, limit } }),
  getUnreadCount: () => api.get('/alerts/unread-count'),
  markAsRead: (id) => api.post(`/alerts/${id}/read`),
  markAllAsRead: () => api.post('/alerts/mark-all-read'),
  delete: (id) => api.delete(`/alerts/${id}`),
  clearAll: () => api.delete('/alerts'),
  
  // Configuration des actions
  getConfig: (sourceType, sourceId) => 
    api.get(`/alerts/config/${sourceType}/${sourceId}`),
  saveConfig: (config) => api.post('/alerts/config', config)
};

api.alerts = alertsAPI;

export default api;