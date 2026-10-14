<img width="1536" height="1024" alt="Splitzy Enterprise" src="https://github.com/user-attachments/assets/3fc5f000-7918-4bc9-b418-8dd3a2a20fe8" />

## Overview

Splitzy is a modern expense sharing platform that simplifies splitting bills and managing shared expenses with friends, roommates, and groups. Whether you're sharing dinner costs, splitting rent, or managing group travel expenses, Splitzy makes it easy to track who owes what and settle up seamlessly.

## Features

- **👥 Group Management**: Create and manage expense groups with multiple participants
- **✉️ Invite by Email**: Add friends who haven't signed up yet; they can be part of expenses right away and keep everything when they join
- **💸 Easy Expense Tracking**: Add expenses with customizable splitting options
- **📊 Smart Calculations**: Automatic calculation of who owes whom and how much
- **🔄 Multiple Split Types**:
  - Equal splits
  - Custom amounts
  - Percentage-based splits
  - Share-based splits
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **💳 Settlement Tracking**: Keep track of payments and settle debts
- **📈 Expense Analytics**: Visual insights into spending patterns
- **🔐 Secure Authentication**: Safe and secure user authentication
- **📸 Smart Receipt Scanning**: AI-powered OCR to automatically extract expense details from receipts
- **📤 Export to Excel**: Download group expenses to CSV/Excel for offline records
- **🔔 Smart Reminders**: Send gentle notifications to remind friends about pending settlements
- **📧 Notifications**: Email reminders for pending expenses and settlements

## Technology Stack

| Component | Version | Details |
|-----------|---------|---------|
| **Backend** | .NET 10 (SDK 10.0.100+) | ASP.NET Core Web API |
| **Frontend** | Angular 20.1.3 | Standalone Components |
| **Database** | PostgreSQL | Relational DBMS |
| **TypeScript** | 5.8.3 | Type Safety |
| **Node.js** | 20+ | Build & Runtime |
| **Authentication** | OAuth 2.0 | Identity Management |
| **Containerization** | Docker | Deployment & Orchestration |
| **CI/CD** | GitHub Actions | Automated Pipelines |

## Architecture

### Backend Services
- RESTful API built on ASP.NET Core 10
- Entity Framework Core for data persistence (migrations applied at startup)
- RabbitMQ queue for email notifications
- JWT-based authentication with refresh token support
- Comprehensive logging and error handling

### Frontend Application
- Angular 20 with standalone components
- Tailwind CSS for responsive UI
- Service Worker for offline support
- IndexedDB for client-side caching

### Data Storage
- PostgreSQL with Entity Framework migrations
- Normalized schema for financial data integrity
- Audit logging for compliance

## Branching

All work merges into `beta` first. Only `beta` can be merged into `main`: the PR Build check fails for any other source branch. `main` deploys to production, so `beta` is tested in the [beta environment](BETA.md) before it is promoted.

```
feature/fix branch ──PR──▶ beta ──PR (after testing)──▶ main ──▶ production
```

## CI/CD Pipelines

| Pipeline | Trigger | Purpose |
|----------|---------|---------|
| **PR Build** (`pr-build.yml`) | Pull requests to `main` and `beta` | Branch policy (only `beta` → `main`), backend build and tests, UI build |
| **Backend Build** (`backend.yml`) | Manual/workflow call | Docker image build and push |
| **Full Deploy** (`build_and_deploy.yml`) | Push to `main` | Orchestrated production deployment |
| **Dev Deploy** (`ui-dev-deploy.yml`) | Push to `dev` branch | Development environment deployment |

## Security

- Industry-standard encryption for data at rest and in transit
- OAuth 2.0 for secure authentication
- Comprehensive audit logging for all transactions
- Email verification for user accounts

## Deployment

### Production Environment
- Containerized deployment via Docker
- Self-hosted runner with GitHub Actions
- Automatic version tagging and image cleanup
- Zero-downtime deployments

### Beta Environment
- `beta` branch, served at https://splitzy-beta.aarshiv.xyz next to production
- Own database (`splitzy_beta`, a copy of production) and RabbitMQ queues on the shared servers
- Setup, testing checklist and promotion steps: [BETA.md](BETA.md)

### Development Environment
- Automated deployment on `dev` branch push
- MinIO object storage integration
- Continuous integration testing

## Roadmap

- [ ] Mobile application
- [ ] Advanced analytics dashboard
- [ ] Multi-currency support
- [ ] Integration with payment systems
- [ ] Recurring expense automation
- [ ] Expense approval workflows

## Support & Contribution

**Issues & Bugs**: [GitHub Issues](https://github.com/Splitzzyy/Splitzy/issues)

**Documentation**: [Wiki](https://github.com/Splitzzyy/Splitzy/wiki)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by Splitwise and similar expense sharing apps
- Thanks to all contributors who have helped improve Splitzy

---

⭐ If you find Splitzy helpful, please give it a star on GitHub!
