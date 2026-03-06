# ShadowTest 🛡️

### **Autonomous User Experience & Behavioral Logic Testing**  
*The world's first AI-native testing platform that discovers UX friction before your users do.*

---

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tech: Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black)](https://nextjs.org/)
[![Tech: Python](https://img.shields.io/badge/Engine-Python%203.9-blue)](https://www.python.org/)
[![Tech: Claude](https://img.shields.io/badge/AI-Claude%203.5-orange)](https://anthropic.com/)

[**Explore the Docs**](./DEPLOYMENT.md) | [**View PRD**](./ShadowTest-PRD.md) | [**Request Demo**](mailto:harshsahay2709@gmail.com)

---

## 🚀 The Vision

Traditional testing (Unit, Integration, E2E) validates **code**. ShadowTest validates **behavior**. 

ShadowTest leverages high-reasoning LLMs to simulate synthetic personas—ranging from technical experts to novice users—who navigate your product autonomously. By observing their reasoning traces, ShadowTest identifies confusing UI, broken flows, and edge cases that standard automated scripts simply cannot catch.

---

## 🏗️ System Architecture

ShadowTest is engineered as a scalable, microservices-driven monorepo.

| Component | Documentation | Technology | Role |
| :--- | :--- | :--- | :--- |
| **Frontend** | [web/README.md](./web/README.md) | **Next.js 16**, Tailwind, Clerk | High-performance dashboard & live monitoring. |
| **Core API** | [api/README.md](./api/README.md) | **Node.js**, Express, Prisma | Orchestration, state management, and persistency. |
| **AI Engine** | [ai-engine/README.md](./ai-engine/README.md) | **Python**, FastAPI, Claude 3.5 | High-reasoning behavioral simulation & scraping. |

---

## 📁 Repository Structure

```text
/apps
├── ai-engine/    # Cognitive reasoning & autonomous browsing logic
├── api/          # Secure RESTful API & database orchestration
├── web/          # Modern enterprise dashboard & live trace UI
├── render.yaml   # Infrastructure-as-code for Render deployment
└── README.md     # Project overview & documentation
```

---

## 🏁 Getting Started

ShadowTest requires a coordinated launch of all three services.

1.  **AI Engine**:
    ```bash
    cd ai-engine && pip install -r requirements.txt && python main.py
    ```
2.  **API Gateway**:
    ```bash
    cd api && npm install && npx prisma db push && npm run dev
    ```
3.  **Frontend**:
    ```bash
    cd web && npm install && npm run dev
    ```

Refer to the **[Production Deployment Guide](./DEPLOYMENT.md)** for Vercel and Render instructions.

---

*Copyright Developed with ❤️ by Harsh Mriduhash*