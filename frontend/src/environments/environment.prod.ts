export const environment = {
  production: true,
  apiUrl: '${API_URL}/api', // Set in Netlify env: API_URL=https://cloud-kitchen-api.onrender.com
  socketUrl: '${API_URL}', // SOCKET_URL=https://cloud-kitchen-api.onrender.com
  clientUrl: '${CLIENT_URL}' // CLIENT_URL=https://your-app.netlify.app
};
