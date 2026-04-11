# Cloud Kitchen Backend - Production Ready

## 🚀 Render Deployment

1. **MongoDB Atlas Setup**
   - Create free M0 cluster at [MongoDB Atlas](https://cloud.mongodb.com)
   - Database user with readWrite
   - Network Access: Add IP 0.0.0.0/0
   - Connection string: `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/cloudkichen?retryWrites=true&w=majority`

2. **GitHub Repo**
   ```
   git init
   git add .
   git commit -m "Production ready backend"
   git remote add origin https://github.com/yourusername/cloud-kitchen-backend.git
   git push -u origin main
   ```

3. **Render Dashboard**
   - New > Web Service > Connect GitHub repo
   - Settings:
     | Field | Value |
     |-------|-------|
     | Name | cloud-kitchen-api
     | Environment | Node
     | Region | closest
     | Branch | main
     | Build Command | `npm install`
     | Start Command | `npm start`
     | Instance Type | Free

4. **Environment Variables** (Dashboard > Environment)
   ```
   Copy from .env.example and add your values
   NODE_ENV=production
   MONGO_URI=...
   JWT_SECRET=...
   CLIENT_URL=https://your-frontend.netlify.app  # Update after frontend deploy
   SMTP_*=...
   RAZORPAY_*=...
   ```

5. **Deploy & Verify**
   - Deploy → View Logs
   - API URL: https://cloud-kitchen-api.onrender.com
   - Test: `curl https://your-api.onrender.com/api/health`
   - Sockets/WebSockets supported automatically

## 🛠 Local Development

```
npm install
npm run dev
```

Access: http://localhost:5000

## 📋 Health Check

`/api/health` - DB, kitchen status, orders 24h

## 🔒 Security Features

- Helmet, CORS restricted
- Rate limiting (auth: 100/hr, api: 1000/hr)
- JWT auth
- Prod error hiding

## ⚙️ Frontend Integration

Update frontend environment:
```
API_URL=https://your-api.onrender.com/api
SOCKET_URL=https://your-api.onrender.com
```

## Common Pitfalls

- Render free tier sleeps after 15min inactivity (cold starts ~30s)
- Update CLIENT_URL after frontend deploy
- MongoDB whitelist 0.0.0.0/0
- Strong JWT_SECRET (>32 chars)
- Gmail App Password (not regular password)

## Logs

Render dashboard logs or `npm run healthcheck`

