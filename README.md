# Orchestra

**Next-Generation Workflow Automation and AI Orchestration Platform**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## Overview

Orchestra is a powerful, enterprise-ready workflow automation and AI orchestration platform that combines visual workflow building with advanced multi-agent AI capabilities. Named to evoke the idea of multiple components working in concert under a guiding conductor, Orchestra enables teams to build, deploy, and manage complex automations with unprecedented ease and power.

## Key Features

- **Visual Workflow Automation**: Beautiful drag-and-drop workflow editor with real-time execution visualization
- **AI-Native Orchestration**: Deep integration with LLMs and multi-agent systems (System1/2/3 architecture)
- **Enterprise-Ready**: Built-in RBAC, SSO (SAML/OIDC), audit logging, and compliance features
- **Real-Time Interactive Execution**: Live preview mode with animated node execution and data inspection
- **Marketplace**: Share and reuse workflow templates within teams or publicly
- **Extensibility**: Robust plugin framework for custom nodes and integrations
- **High Performance**: Horizontal scaling with container orchestration support
- **Observability**: Comprehensive execution traces, metrics, and monitoring dashboards

## Architecture

Orchestra follows a modular, decoupled architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Vue 3)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Canvas Editor│  │ Chat Assistant│  │  Marketplace │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                             ↕ REST API / WebSocket
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Workflow Engine│  │Agent Orchestr│  │   API Layer  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│    PostgreSQL    │    Redis    │   Vector Store (Optional)  │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
Orchestra/
├── packages/
│   ├── backend/          # Node.js/TypeScript backend
│   │   ├── src/
│   │   │   ├── api/      # REST API endpoints
│   │   │   ├── engine/   # Workflow execution engine
│   │   │   ├── agents/   # Multi-agent orchestration
│   │   │   ├── nodes/    # Integration nodes library
│   │   │   ├── auth/     # Authentication & RBAC
│   │   │   ├── database/ # Database models & migrations
│   │   │   └── utils/    # Shared utilities
│   │   └── tests/
│   └── frontend/         # Vue 3/TypeScript frontend
│       ├── src/
│       │   ├── components/
│       │   ├── views/
│       │   ├── composables/
│       │   └── assets/
│       └── tests/
├── docs/                 # Documentation
├── examples/             # Example workflows
└── .github/              # CI/CD workflows
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 13 (or SQLite for development)
- Redis >= 6.0 (optional, for distributed mode)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Orchestra

# Install dependencies
npm install

# Set up environment variables
cp packages/backend/.env.example packages/backend/.env
# Edit .env with your configuration

# Run database migrations
npm run migrate --workspace=packages/backend

# Start development servers
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:3000`.

### Quick Start

1. **Create your first workflow**: Open the Orchestra UI and use the visual editor to drag and drop nodes
2. **Configure nodes**: Click on nodes to set their parameters
3. **Connect nodes**: Draw connections between node outputs and inputs
4. **Test run**: Click the "Run" button to execute your workflow with live visualization
5. **Use AI Assistant**: Open the chat panel and describe what you want to build

## Configuration

### Environment Variables

Key environment variables for the backend:

```env
# Database
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=orchestra
DATABASE_USER=orchestra
DATABASE_PASSWORD=your_password

# Redis (for distributed mode)
REDIS_HOST=localhost
REDIS_PORT=6379

# Azure OpenAI (for AI features)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_DEPLOYMENT=gpt-4

# Authentication
JWT_SECRET=your_secret_key
SSO_ENABLED=false

# Security
ENCRYPTION_KEY=your_encryption_key
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests only
npm test --workspace=packages/backend

# Run frontend tests only
npm test --workspace=packages/frontend
```

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build:backend
npm run build:frontend
```

## Deployment

### Docker

```bash
# Build Docker image
docker build -t orchestra:latest .

# Run with Docker Compose
docker-compose up -d
```

### Kubernetes

Helm charts are available in the `deploy/k8s` directory:

```bash
helm install orchestra ./deploy/k8s/orchestra
```

## Security

Orchestra is built with enterprise security in mind:

- **Authentication**: SSO via SAML/OIDC, or local authentication
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: At-rest encryption for sensitive data, TLS in transit
- **Secrets Management**: Integration with Azure Key Vault, CyberArk
- **Audit Logging**: Comprehensive audit trails for compliance
- **Compliance**: HIPAA, HITRUST, NIST 800-53 ready

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Copyright © 2025 Orchestra Team

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Support

- Documentation: [docs/](docs/)
- Issues: GitHub Issues
- Discussions: GitHub Discussions

## Roadmap

See [ROADMAP.md](ROADMAP.md) for upcoming features and improvements.

---

**Orchestra** - Orchestrating the future of automation 🎼
