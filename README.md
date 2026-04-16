<<<<<<< HEAD
# 🌟 CloudKitchen - Next-Gen Cloud Kitchen Management System

[![Angular](https://img.shields.io/badge/Angular-19-green?style=flat&logo=angular)](https://angular.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20-blue?style=flat&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green?style=flat&logo=mongodb)](https://mongodb.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-real--time?style=flat&logo=socket.io)](https://socket.io)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Backend](https://img.shields.io/badge/Backend-Express.js-brightgreen)](https://expressjs.com)

## 🚀 Overview

**CloudKitchen** is a production-ready, full-stack cloud kitchen management platform designed for modern restaurants. Streamline operations with AI-powered voice ordering, real-time kitchen dashboards, multi-payment gateways (Stripe/Razorpay), inventory tracking, and advanced admin analytics.

**Key Highlights:**
- ⚡ **Real-time Updates**: Socket.IO for live order tracking and kitchen status
- 🤖 **AI Voice Ordering**: Natural language intent detection and menu recommendations
- 💳 **Payments**: Secure Stripe & Razorpay integration with PDF invoice generation
- 📱 **Responsive UI**: Angular Material design for desktop, tablet, mobile
- 👨‍💼 **Admin Suite**: Complete dashboard for inventory, menu, tables, revenue
- 🔐 **Secure**: JWT auth, bcrypt, helmet, rate limiting

![Demo GIF](demo.gif) <!-- Replace with actual demo recording -->

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Voice Ordering** | AI processes natural speech for menu items, addresses, recommendations |
| **Order Management** | Create/track orders, session-based ordering, kitchen assignment |
| **Kitchen Dashboard** | Real-time status, inventory alerts, order assignment |
| **Menu & Categories** | Dynamic menu with images, half-price migration, category mgmt |
| **Payments & Invoices** | Multi-gateway, auto PDF invoices with uploads |
| **Admin Tools** | Revenue charts, user mgmt, table booking, coupons |
| **Offline Support** | PWA-ready with IndexedDB, service worker |
| **Analytics** | Revenue dashboard with Chart.js visualizations |

## 🏗️ Tech Stack

```
Frontend: Angular 19 + Material + RxJS + Socket.IO Client + Stripe.js
Backend: Node.js + Express 5 + Mongoose + Socket.IO + JWT + Multer
Database: MongoDB
Payments: Stripe + Razorpay
AI: Custom intent detector + menu fetcher
Utils: PDFKit + Nodemailer + Cron jobs
Deployment: Netlify (frontend) + Vercel/Heroku (backend)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- Stripe/Razorpay test keys

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Add DB_URI, JWT_SECRET, STRIPE_KEY, etc.
npm run dev
```
Server runs on `http://localhost:5000`

### Frontend Setup
```bash
cd frontend
npm install
ng serve
```
App runs on `http://localhost:4200`

### Seeding Data
```bash
cd backend
npm run seed  # Populates categories, menu items
```

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | User authentication |
| `POST` | `/api/orders` | Create order |
| `GET` | `/api/menu` | Fetch menu items |
| `GET` | `/api/ai/voice` | Process voice commands |
| `POST` | `/api/payment/stripe` | Process payment |
| `GET` | `/api/revenue/dashboard` | Admin revenue data |

**API Docs**: [Postman Collection](docs/api.postman.json) (Coming soon)

## 📁 Project Structure

```
cloud-kichen/
├── backend/           # Express API + MongoDB models
│   ├── controllers/   # Business logic
│   ├── models/        # Mongoose schemas
│   ├── routes/        # API routes
│   └── modules/ai-engine/ # Voice AI
├── frontend/          # Angular 19 SPA
│   ├── src/app/components/
│   │   ├── admin/     # Dashboard suites
│   │   ├── cart/      # Shopping cart
│   │   └── voice-order/
│   └── services/      # API + Socket services
└── uploads/           # Menu images + Invoices
```

## 🛠️ Scripts & Utils

- `backend/scripts/migrateRoles.js` - User role migration
- `backend/scripts/addOrderIds.js` - Order ID counter setup
- Cron jobs for inventory alerts
- Email templates for confirmations

## 📸 Screenshots

| Home & Menu | Kitchen Dashboard | Admin Revenue |
|-------------|------------------|---------------|
| ![Home](screenshots/home.png) | ![Kitchen](screenshots/kitchen.png) | ![Revenue](screenshots/revenue.png) |

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

This project is [ISC](LICENSE) licensed.

## 🙌 Acknowledgments

- [Angular Team](https://angular.dev)
- [Express.js](https://expressjs.com)
- [MongoDB](https://mongodb.com)
- All contributors!

---

⭐ **Star this repo if you find it useful!** ⭐

**Deployed Live**: [cloudkitchen.app](https://cloudkitchen.app) (Coming soon)

*Built with ❤️ for modern cloud kitchens*

=======
🚀 CloudKitchen — Next-Gen Cloud Kitchen Platform

⚡ A production-grade, AI-powered cloud kitchen management system built for scalability, automation, and real-time operations.

🌐 Live Vision

CloudKitchen transforms how modern restaurants operate — combining AI, real-time systems, and seamless UX into one powerful platform.

🧠 From voice-based ordering → 🍳 kitchen automation → 💳 payments → 📊 analytics
Everything in one ecosystem.

✨ Why CloudKitchen?

✔️ Built like a real startup product
✔️ Designed for scale (multi-restaurant ready)
✔️ Focus on automation & real-time experience
✔️ Clean architecture + production best practices

🔥 Core Features
🤖 AI Voice Ordering
Natural language processing for orders
Smart menu suggestions
Intent-based command detection
⚡ Real-Time Kitchen System
Live order updates using Socket.IO
Kitchen dashboard with instant sync
Order status tracking (pending → preparing → delivered)
💳 Smart Payments
Stripe + Razorpay integration
Secure checkout flow
Auto-generated PDF invoices
📊 Admin Intelligence Dashboard
Revenue analytics (Chart.js)
Inventory monitoring & alerts
User & order management
🍽️ Advanced Order Flow
Session-based dine-in system
Multiple orders per table
Add-more functionality without conflict
📱 PWA + Responsive UI
Mobile-first Angular design
Offline-ready with IndexedDB
Smooth UX across all devices
🏗️ Tech Architecture
Frontend
  └── Angular 19 + Material + RxJS + Socket.IO Client

Backend
  └── Node.js + Express 5 + MongoDB + Mongoose

Realtime Layer
  └── Socket.IO (bi-directional updates)

Payments
  └── Stripe + Razorpay

AI Engine
  └── Custom Intent Detection + Menu Engine

Utilities
  └── PDFKit + Nodemailer + Cron Jobs

Deployment
  └── Netlify (Frontend) + Render/Vercel (Backend)
📸 Product Preview
🏠 Customer Experience
Browse menu
Voice-based ordering
Add to cart & checkout
🍳 Kitchen Dashboard
Live incoming orders
Status updates in real-time
Inventory alerts
👨‍💼 Admin Panel
Revenue insights
Order tracking
Menu & category management
🚀 Getting Started
⚙️ Prerequisites
Node.js ≥ 20
MongoDB (Local / Atlas)
Stripe / Razorpay API Keys
🔧 Backend Setup
cd backend
npm install
cp .env.example .env
npm run dev

Server → http://localhost:5000

🎨 Frontend Setup
cd frontend
npm install
ng serve

App → http://localhost:4200

🌱 Seed Initial Data
cd backend
npm run seed
📡 API Overview
Method	Endpoint	Description
POST	/api/auth/login	User login
GET	/api/menu	Fetch menu
POST	/api/orders	Create order
GET	/api/ai/voice	Process voice
POST	/api/payment/stripe	Payment
GET	/api/revenue/dashboard	Analytics
📂 Project Structure
cloud-kitchen/
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── modules/ai-engine/
│
├── frontend/
│   ├── components/
│   │   ├── admin/
│   │   ├── cart/
│   │   └── voice-order/
│   └── services/
│
└── uploads/
🧠 Advanced Capabilities
🔐 JWT Authentication + Role-Based Access
📦 Inventory Auto Alerts (Cron Jobs)
📧 Email Notifications (Order + Invoice)
⚡ Socket-based Table Locking System
🧾 Auto Invoice Generation (PDF)
🧩 Scalable Modular Architecture
🚀 Deployment Guide (Quick)
Layer	Platform
Frontend	Netlify
Backend	Render / Vercel
Database	MongoDB Atlas
🤝 Contributing
git checkout -b feature/your-feature
git commit -m "Add new feature"
git push origin feature/your-feature

Then open a PR 🚀

📄 License

Licensed under ISC License

🙌 Credits
Angular Team
Express.js
MongoDB
Open Source Community ❤️
🌟 Final Note

This is not just a project — it's a production-ready SaaS foundation for cloud kitchens.
>>>>>>> c99ada4e92148a96e1420ccd60c7af9852965922
