# Contributing to Orchestra

Thank you for your interest in contributing to Orchestra! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Follow the [Getting Started Guide](docs/GETTING_STARTED.md) to set up your development environment

## Development Workflow

### 1. Before You Start

- Check existing issues and pull requests to avoid duplicates
- Open an issue to discuss major changes before implementing
- Ensure your development environment is properly set up

### 2. Making Changes

- Write clear, concise commit messages
- Follow the existing code style and conventions
- Add tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 3. Code Style

#### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow the existing ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer `const` over `let`, avoid `var`

#### Vue Components

- Use the Composition API (`<script setup>`)
- Keep components focused and reusable
- Use TypeScript for props and emits
- Follow Vue 3 best practices

#### File Headers

All source files must include a header:

```typescript
/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Brief description of the file
 */
```

### 4. Testing

- Write unit tests for new functionality
- Ensure all tests pass: `npm test`
- Aim for high test coverage
- Test edge cases and error conditions

#### Running Tests

```bash
# Run all tests
npm test

# Run backend tests
npm test --workspace=packages/backend

# Run frontend tests
npm test --workspace=packages/frontend

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### 5. Linting

Run linting before committing:

```bash
# Lint all code
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Type checking
npm run typecheck
```

### 6. Committing

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(engine): add support for parallel node execution

Implements parallel execution for workflow branches that can run independently.
Includes tests and documentation updates.

Closes #123
```

```
fix(ui): prevent workflow canvas from crashing on empty connections

Added null checks in the connection rendering logic.

Fixes #456
```

## Pull Request Process

### 1. Before Submitting

- Ensure all tests pass
- Update documentation if needed
- Rebase on latest main branch
- Squash commits if necessary

### 2. Creating a Pull Request

1. Push your branch to your fork
2. Open a pull request against the `main` branch
3. Fill out the PR template completely
4. Link related issues
5. Request review from maintainers

### 3. PR Title Format

Use the same format as commit messages:

```
feat(engine): add parallel execution support
fix(ui): resolve canvas crash on empty connections
```

### 4. PR Description

Include:
- Summary of changes
- Motivation and context
- How to test the changes
- Screenshots (for UI changes)
- Related issues

### 5. Review Process

- Address all review comments
- Keep the PR focused on a single feature/fix
- Be responsive to feedback
- Update tests and docs as requested

### 6. After Approval

- Maintainers will merge your PR
- Delete your feature branch after merge

## Project Structure

```
Orchestra/
├── packages/
│   ├── backend/           # Backend package
│   │   ├── src/
│   │   │   ├── api/       # REST API
│   │   │   ├── engine/    # Workflow engine
│   │   │   ├── agents/    # AI agents
│   │   │   ├── nodes/     # Node types
│   │   │   ├── auth/      # Authentication
│   │   │   ├── database/  # Database layer
│   │   │   └── utils/     # Utilities
│   │   └── tests/
│   └── frontend/          # Frontend package
│       ├── src/
│       │   ├── components/
│       │   ├── views/
│       │   ├── stores/
│       │   └── services/
│       └── tests/
├── docs/                  # Documentation
├── examples/              # Example workflows
└── .github/               # CI/CD
```

## Adding New Features

### Adding a New Node Type

1. Create node definition in `packages/backend/src/nodes/`
2. Implement the `INodeType` interface
3. Register in `NodeTypeRegistry`
4. Add tests
5. Update documentation

Example:
```typescript
// packages/backend/src/nodes/actions/MyNode.ts
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    group: ['action'],
    version: 1,
    description: 'Does something useful',
    defaults: { name: 'My Node' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      // Define parameters
    ],
  };

  async execute(context: INodeExecutionContext): Promise<any> {
    // Implementation
  }
}

// Register
import { nodeRegistry } from '@/nodes/NodeTypeRegistry';
nodeRegistry.register('myNode', new MyNode());
```

### Adding a New API Endpoint

1. Create route file in `packages/backend/src/api/routes/`
2. Add controller logic
3. Update route registration
4. Add authentication/authorization
5. Add tests
6. Update API documentation

### Adding a New Vue Component

1. Create component in `packages/frontend/src/components/`
2. Use TypeScript and Composition API
3. Add props/emits types
4. Style with Tailwind CSS
5. Add tests
6. Update component documentation

## Documentation

### Code Documentation

- Add JSDoc comments to all public functions
- Include parameter descriptions and return types
- Provide examples for complex APIs

### User Documentation

- Update relevant docs in `docs/` folder
- Include screenshots for UI features
- Provide code examples
- Keep documentation in sync with code

### API Documentation

- Document all API endpoints
- Include request/response examples
- List possible error codes
- Specify authentication requirements

## Bug Reports

### Before Submitting

- Search existing issues
- Verify the bug exists on latest version
- Collect reproduction steps
- Note your environment

### Creating a Bug Report

Include:
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs if applicable
- Environment details (OS, Node version, etc.)

Use the bug report template when available.

## Feature Requests

### Creating a Feature Request

Include:
- Clear, descriptive title
- Use case and motivation
- Proposed solution
- Alternative solutions considered
- Mockups/diagrams if applicable

Use the feature request template when available.

## Security Issues

**Do not open public issues for security vulnerabilities.**

Instead, email security@orchestra.example.com with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours.

## License

By contributing to Orchestra, you agree that your contributions will be licensed under the Apache License 2.0.

## Questions?

- Open a discussion on GitHub Discussions
- Check existing documentation
- Ask in pull request comments

## Recognition

All contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project README (for significant contributions)

---

Thank you for contributing to Orchestra! 🎼
