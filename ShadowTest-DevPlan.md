You are a senior full-stack engineer and AI infrastructure architect.

Build a **production ready SaaS web application** called:

ShadowTest

This must be a real SaaS product, not a demo.

The application must support real users, persistent data, and deployment.

---

# Product Overview

ShadowTest is an AI platform that creates synthetic user personas that test a product by performing tasks and generating behavioral insights.

Users provide:

• product description
• optional GitHub repo
• optional product URL
• tasks to simulate

The AI persona attempts the task and generates reasoning traces.

---

# Tech Stack

Frontend

Next.js 14  
TypeScript  
TailwindCSS  
Shadcn UI  
Framer Motion  

Backend

Node.js  
Express  

AI Service

Python  
FastAPI  

Database

PostgreSQL using Prisma ORM.

Cache

Redis.

Vector Database

Qdrant or Pinecone.

---

# Infrastructure

Frontend

Deploy to Vercel.

Backend

Deploy to Render or Railway.

AI Engine

FastAPI container.

---

# Authentication

Use NextAuth.

Support

• email/password
• Google OAuth
• GitHub OAuth

JWT expiry

15 minutes.

Refresh token

7 days.

---

# Database Schema

Users

id  
email  
password  
created_at  

Projects

id  
user_id  
name  
description  
repo_url  
product_url  

Personas

id  
project_id  
name  
traits  
behavior_model  

Simulations

id  
project_id  
persona_id  
task  
status  

SimulationSteps

id  
simulation_id  
step_number  
observation  
interpretation  
decision  
action  
outcome  

Reports

id  
simulation_id  
summary  
insights  

---

# Core User Flow

Landing Page

→ Signup

→ Dashboard

→ Create Project

→ Select Persona

→ Define Task

→ Run Simulation

→ View Report

---

# Landing Page UI

Hero Section

Headline

Synthetic Users That Test Your Product

CTA

Start Testing Free

Secondary CTA

View Demo

---

Features Section

Cards

AI Personas  
Behavior Simulation  
UX Insights  
Developer Testing  

---

Pricing Section

Free

3 simulations/month.

Starter

$29/month.

Pro

$99/month.

---

# Dashboard

Sidebar navigation

Projects  
Personas  
Simulations  
Reports  
Settings  

Main area

Project cards.

Create Project button.

---

# Simulation Page

Display live simulation trace.

Left Panel

Persona profile.

Right Panel

Simulation steps.

Observation  
Interpretation  
Decision  
Action  
Outcome

---

# Reports Page

Show

• success rate
• friction points
• confusion events

Allow

Export report.

---

# UI Styling

Dark mode default.

Colors

Primary #6366F1  
Secondary #8B5CF6  
Accent #22C55E  

Background #0F172A

---

# UI Components

Implement loaders

• shimmer loaders
• skeleton cards
• circular loaders
• progress bars
• pulse loaders

---

# Performance

Implement

• pagination
• infinite scroll
• Redis caching

---

# Security

Implement

• JWT auth
• rate limiting
• input validation
• CORS protection

---

# AI Simulation Engine

Simulation loop

Observation

Interpret page content.

Interpretation

Understand context.

Decision

Select next action.

Action

Execute step.

Outcome

Evaluate result.

Store each step in database.

---

# Final Requirements

The app must include

• landing page
• authentication
• onboarding
• dashboard
• project system
• persona system
• simulation engine
• reporting system

Code must be modular, scalable, and deployable.