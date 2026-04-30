import api from './axios.js';

export async function getPlatformStats() {
  const response = await api.get('/api/social/stats');
  return response.data;
}

export async function getPublicJobs(params = {}) {
  const response = await api.get('/api/social/public-jobs', { params });
  return response.data.jobs || [];
}

export async function getWins(params = {}) {
  const response = await api.get('/api/social/wins', { params });
  return response.data;
}

export async function postWin(payload) {
  const response = await api.post('/api/social/wins', payload);
  return response.data;
}

export async function likeWin(winId) {
  const response = await api.post(`/api/social/wins/${winId}/like`);
  return response.data;
}

export async function getPublicProfile(username) {
  const response = await api.get(`/api/social/profile/${username}`);
  return response.data;
}

export async function getPublicResilienceProfile(username) {
  const response = await api.get(`/api/social/profile/${username}`);
  return response.data?.resilience_portfolio || null;
}

export async function getResilienceDetails(username) {
  const response = await api.get(`/api/social/profile/${username}/resilience-details`);
  return response.data;
}

export async function chatWithShadowResume(username, message) {
  const response = await api.post(`/api/shadow-resume/${username}/chat`, { message });
  return response.data;
}

export async function getMyProfile() {
  const response = await api.get('/api/social/my-profile');
  return response.data;
}

export async function saveSocialProfile(payload) {
  const response = await api.put('/api/social/profile', payload);
  return response.data;
}

export async function checkUsername(username) {
  const response = await api.get(`/api/social/check-username/${username}`);
  return response.data;
}

export async function getFollowStatus(username) {
  const response = await api.get(`/api/social/profile/${username}/is-following`);
  return response.data.isFollowing;
}

export async function followProfile(username) {
  const response = await api.post(`/api/social/follow/${username}`);
  return response.data;
}

export async function unfollowProfile(username) {
  const response = await api.delete(`/api/social/follow/${username}`);
  return response.data;
}

export async function createSocialPost(payload) {
  const response = await api.post('/api/social/posts', payload);
  return response.data;
}

export async function getFeedPosts(params = {}) {
  const response = await api.get('/api/social/feed', { params });
  return response.data;
}

export async function getPublicFeedPosts(params = {}) {
  const response = await api.get('/api/social/feed/public', { params });
  return response.data;
}

export async function likePost(postId) {
  const response = await api.post(`/api/social/posts/${postId}/like`);
  return response.data;
}

export async function addPostComment(postId, content) {
  const response = await api.post(`/api/social/posts/${postId}/comments`, { content });
  return response.data;
}

export async function getPostComments(postId, params = {}) {
  const response = await api.get(`/api/social/posts/${postId}/comments`, { params });
  return response.data.comments || [];
}

export async function deleteSocialPost(postId) {
  const response = await api.delete(`/api/social/posts/${postId}`);
  return response.data;
}

export async function sendConnectionRequest(username, note = '') {
  const response = await api.post(`/api/social/connections/request/${username}`, { note });
  return response.data;
}

export async function respondToConnection(connectionId, action) {
  const response = await api.put(`/api/social/connections/${connectionId}`, { action });
  return response.data;
}

export async function getConnections() {
  const response = await api.get('/api/social/connections');
  return response.data.connections || [];
}

export async function getPendingConnections() {
  const response = await api.get('/api/social/connections/pending');
  return response.data.requests || [];
}

export async function getConnectionStatus(username) {
  const response = await api.get(`/api/social/connections/status/${username}`);
  return response.data;
}

export async function getNotifications(params = {}) {
  const response = await api.get('/api/social/notifications', { params });
  return response.data;
}

export async function markNotificationsRead(payload) {
  const response = await api.put('/api/social/notifications/read', payload);
  return response.data;
}

export async function getUnreadNotificationCount() {
  //const response = await api.get('/api/social/notifications/count');
 // return response.data.unreadCount || 0;
}

export async function searchPeople(params = {}) {
  const response = await api.get('/api/social/people/search', { params });
  return response.data.people || [];
}

export async function getProfileFollowers(username) {
  const response = await api.get(`/api/social/profile/${username}/followers`);
  return response.data.followers || [];
}

export async function getProfileFollowing(username) {
  const response = await api.get(`/api/social/profile/${username}/following`);
  return response.data.following || [];
}

export async function getProfileConnections(username) {
  const response = await api.get(`/api/social/profile/${username}/connections`);
  return response.data.connections || [];
}
