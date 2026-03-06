# ShadowTest API Gateway ⚙️

The core orchestration service for the ShadowTest platform. Manages state, persists simulation data, and coordinates between the frontend and the AI reasoning engine.

## ✨ Features

- **State Management**: PostgreSQL persistence using Prisma ORM.
- **Orchestration**: Triggers AI simulations and streams real-time traces back to the dashboard.
- **Security**: Validates Clerk JWTs and ensures multi-tenant data isolation via `x-user-id`.
- **Relational Integrity**: Tracks Projects, Personas, Simulations, and granular Behavioral Steps.

## 🛠️ Tech Stack

- **Runtime**: Node.js (TypeScript)
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL (Optimized for Vercel Postgres)
- **Communication**: RESTful API / JSON

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Database Sync**:
    ```bash
    npx prisma db push
    ```
3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

---

*Part of the [ShadowTest](./../README.md) Infrastructure*
