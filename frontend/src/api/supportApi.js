import api from './axios.js';

export async function getSupportTickets() {
  const response = await api.get('/api/support/tickets');
  return response.data.data || [];
}

export async function createSupportTicket(payload) {
  const response = await api.post('/api/support/tickets', payload);
  return response.data.data;
}

export async function createPublicSupportTicket(payload) {
  const response = await api.post('/api/support/public/tickets', payload);
  return response.data.data;
}

export async function getSupportTicket(ticketId) {
  const response = await api.get(`/api/support/tickets/${ticketId}`);
  return response.data.data;
}

export async function replyToSupportTicket(ticketId, payload) {
  const response = await api.post(`/api/support/tickets/${ticketId}/messages`, payload);
  return response.data.data;
}
