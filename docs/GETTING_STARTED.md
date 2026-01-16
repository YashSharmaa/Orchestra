# Getting Started with Orchestra

This guide will help you set up Orchestra for local development and start building workflows.

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher
- **PostgreSQL**: Version 13 or higher (or use Docker)
- **Redis**: Version 6 or higher (optional, for distributed mode)

## Quick Start with Docker

The easiest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd Orchestra

# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

Once running:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Manual Setup

### 1. Install Dependencies

```bash
# Install all dependencies
npm install
```

This will install dependencies for both the backend and frontend packages.

### 2. Set Up Environment Variables

#### Backend Configuration

```bash
cd packages/backend
cp .env.example .env
```

Edit `.env` and configure at minimum:

```env
# Database (use your local PostgreSQL or Docker)
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=orchestra
DATABASE_USER=your_user
DATABASE_PASSWORD=your_password

# Authentication
JWT_SECRET=your-jwt-secret-at-least-32-characters
ENCRYPTION_KEY=your-encryption-key-32-chars-min

# For AI features (optional)
AZURE_OPENAI_ENABLED=true
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4
```

### 3. Set Up Database

#### Option A: Using Docker for PostgreSQL

```bash
docker run -d \
  --name orchestra-postgres \
  -e POSTGRES_USER=orchestra \
  -e POSTGRES_PASSWORD=orchestra_dev \
  -e POSTGRES_DB=orchestra \
  -p 5432:5432 \
  postgres:15-alpine
```

#### Option B: Using Local PostgreSQL

```bash
# Create database
createdb orchestra

# Or using psql
psql -U postgres -c "CREATE DATABASE orchestra;"
```

### 4. Run Database Migrations

```bash
cd packages/backend
npm run migrate
```

### 5. Start Development Servers

#### Option A: Start Both Services Concurrently

```bash
# From project root
npm run dev
```

#### Option B: Start Services Separately

Terminal 1 - Backend:
```bash
npm run dev:backend
```

Terminal 2 - Frontend:
```bash
npm run dev:frontend
```

### 6. Access the Application

- Open your browser to http://localhost:5173
- You should see the Orchestra home page

## First Steps

### 1. Create Your First Workflow

1. Click **"Get Started"** or navigate to **Workflows**
2. Click **"+ New Workflow"**
3. You'll be taken to the workflow editor

### 2. Add Nodes

1. In the editor, press **Space** or click the **+** button to open the node palette
2. Search for a node type (e.g., "HTTP Request")
3. Click to add it to the canvas

### 3. Configure Nodes

1. Click on a node to select it
2. The properties panel on the right will show configuration options
3. Fill in the required parameters

### 4. Connect Nodes

1. Click on the output port (right side) of one node
2. Drag to the input port (left side) of another node
3. Release to create a connection

### 5. Save and Run

1. Click **"Save"** to save your workflow
2. Click **"Run"** to execute it
3. Watch the nodes animate as they execute in real-time

## Project Structure

```
Orchestra/
├── packages/
│   ├── backend/           # Node.js/TypeScript backend
│   │   ├── src/
│   │   │   ├── api/       # REST API routes & controllers
│   │   │   ├── engine/    # Workflow execution engine
│   │   │   ├── agents/    # Multi-agent orchestration
│   │   │   ├── nodes/     # Integration node types
│   │   │   ├── auth/      # Authentication & authorization
│   │   │   ├── database/  # Database entities & repositories
│   │   │   └── utils/     # Utilities & helpers
│   │   └── tests/         # Backend tests
│   │
│   └── frontend/          # Vue 3/TypeScript frontend
│       ├── src/
│       │   ├── components/  # Vue components
│       │   ├── views/       # Page views
│       │   ├── composables/ # Vue composables
│       │   ├── stores/      # Pinia stores
│       │   ├── services/    # API services
│       │   └── assets/      # Static assets
│       └── tests/           # Frontend tests
│
├── docs/                  # Documentation
├── examples/              # Example workflows
└── .github/               # CI/CD workflows
```

## Development Commands

### Backend

```bash
# Development with hot reload
npm run dev:backend

# Build for production
npm run build:backend

# Run tests
npm test --workspace=packages/backend

# Run database migrations
npm run migrate --workspace=packages/backend

# Create a new migration
npm run migrate:create --workspace=packages/backend

# Type checking
npm run typecheck --workspace=packages/backend

# Linting
npm run lint:backend
npm run lint:fix --workspace=packages/backend
```

### Frontend

```bash
# Development with hot reload
npm run dev:frontend

# Build for production
npm run build:frontend

# Preview production build
npm run preview --workspace=packages/frontend

# Run tests
npm test --workspace=packages/frontend

# Run tests with UI
npm run test:ui --workspace=packages/frontend

# Type checking
npm run typecheck --workspace=packages/frontend

# Linting
npm run lint:frontend
npm run lint:fix --workspace=packages/frontend
```

## Configuration

### Backend Configuration

The backend is configured via environment variables. Key settings:

#### Server
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `NODE_ENV`: Environment (development/production)

#### Database
- `DATABASE_TYPE`: Database type (postgres/mysql/sqlite)
- `DATABASE_HOST`: Database host
- `DATABASE_PORT`: Database port
- `DATABASE_NAME`: Database name
- `DATABASE_USER`: Database user
- `DATABASE_PASSWORD`: Database password

#### Authentication
- `JWT_SECRET`: Secret for JWT tokens (min 32 chars)
- `ENCRYPTION_KEY`: Key for encrypting credentials (min 32 chars)
- `SSO_ENABLED`: Enable SSO authentication
- `DISABLE_AUTH`: Disable auth for development

#### AI Features
- `AZURE_OPENAI_ENABLED`: Enable Azure OpenAI
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI endpoint
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API key
- `AZURE_OPENAI_DEPLOYMENT`: Model deployment name

#### Features
- `MARKETPLACE_ENABLED`: Enable marketplace
- `EVALUATION_ENABLED`: Enable evaluation tools
- `RED_TEAM_TESTING_ENABLED`: Enable red team testing

### Frontend Configuration

The frontend uses Vite's environment variables:

Create `packages/frontend/.env.local`:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## Troubleshooting

### Port Already in Use

If you see "Port 3000 is already in use":

```bash
# Find and kill the process
# On Linux/Mac:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Failed

1. Ensure PostgreSQL is running
2. Check database credentials in `.env`
3. Test connection:
   ```bash
   psql -h localhost -U orchestra -d orchestra
   ```

### Module Not Found Errors

Clear node_modules and reinstall:

```bash
npm run clean
npm install
```

### TypeScript Errors

Run type checking to see detailed errors:

```bash
npm run typecheck
```

## Next Steps

- Read the [Implementation Guide](./IMPLEMENTATION_GUIDE.md) for detailed development instructions
- Explore the [Architecture Documentation](./ARCHITECTURE.md) (to be created)
- Check out [Example Workflows](../examples/) (to be created)
- Review the [API Documentation](./API.md) (to be created)

## Getting Help

- **Issues**: Create an issue on GitHub
- **Documentation**: Check the [docs/](.) folder
- **Examples**: See the [examples/](../examples/) folder

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

Happy building with Orchestra! 🎼
