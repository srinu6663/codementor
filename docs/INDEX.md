# Documentation Index

This directory contains comprehensive project documentation generated during a full architecture audit on 2026-06-22.

---

## Quick Start

**New to this project?** Read these in order:
1. [AI_CONTEXT.md](AI_CONTEXT.md) — 5-minute overview for any engineer or AI assistant
2. [product/product-overview.md](product/product-overview.md) — What the product is and why it exists
3. [architecture/repository-overview.md](architecture/repository-overview.md) — Repository structure and services

---

## Architecture

| Document | Contents |
|----------|---------|
| [architecture/repository-overview.md](architecture/repository-overview.md) | Repo structure, apps, Docker topology, environment variables, integrations |
| [architecture/backend.md](architecture/backend.md) | Express server, middleware, auth system, queue architecture, Socket.IO, security |
| [architecture/frontend.md](architecture/frontend.md) | React frontend, routing, state management, component hierarchy, design system |
| [architecture/data-model.md](architecture/data-model.md) | All database tables, columns, relationships, data flow diagrams |
| [architecture/dependencies.md](architecture/dependencies.md) | Dependency audit: risk assessment, dead deps, missing deps |

---

## Product

| Document | Contents |
|----------|---------|
| [product/product-overview.md](product/product-overview.md) | Executive summary, user personas, terminology, major workflows |
| [product/routes.md](product/routes.md) | Every frontend route and backend API endpoint |
| [product/features.md](product/features.md) | Complete feature inventory with implementation status |
| [product/user-journeys.md](product/user-journeys.md) | End-to-end user flows with sequence diagrams |

---

## Frontend & Backend Reference

| Document | Contents |
|----------|---------|
| [frontend/components.md](frontend/components.md) | All custom components with props, dependencies, reusability |
| [backend/apis.md](backend/apis.md) | Full API documentation with request/response schemas |

---

## Reports

| Document | Contents |
|----------|---------|
| [reports/technical-debt.md](reports/technical-debt.md) | Architecture, security, performance, and maintainability issues ranked by severity |
| [reports/documentation-gaps.md](reports/documentation-gaps.md) | What is undocumented and what needs to be written |
| [reports/release-readiness.md](reports/release-readiness.md) | Critical blockers, high/medium/low priority items, launch checklist |
| [reports/project-health-report.md](reports/project-health-report.md) | Overall project score (6.5/10), dimension scores, recommended actions |

---

## Pre-Existing Documentation

These files existed before this audit:

| Document | Contents |
|----------|---------|
| [API.md](API.md) | Original API reference (high-level) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Original architecture overview |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Original deployment notes |
| [DEPLOYMENT_AZURE.md](DEPLOYMENT_AZURE.md) | Azure-specific deployment guide |
| [PLAGIARISM_SETUP.md](PLAGIARISM_SETUP.md) | JPlag setup instructions |
| [RUN_LOCAL.md](RUN_LOCAL.md) | Local development setup |
| [SECURITY.md](SECURITY.md) | Security notes |

---

## AI_CONTEXT.md

[AI_CONTEXT.md](AI_CONTEXT.md) is a single-file project summary designed to be given to an AI assistant as context for continuing development. It covers: product summary, tech stack, user roles, most important files, data flow, database tables, workflow patterns, known issues, environment variables, and code conventions.
