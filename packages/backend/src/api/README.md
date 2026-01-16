# Orchestra Backend API Layer

Complete REST API implementation for the Orchestra workflow automation platform.

## Overview

This API layer provides comprehensive endpoints for:
- **Authentication**: User registration, login, logout, profile management
- **Workflows**: Full CRUD operations for workflow management
- **Executions**: Start, stop, retry, and monitor workflow executions

## Architecture

```
api/
├── controllers/          # Business logic handlers
│   ├── AuthController.ts
│   ├── ExecutionController.ts
│   ├── WorkflowController.ts
│   └── index.ts
├── middleware/          # Request processing middleware
│   ├── errorHandler.ts  # Global error handling
│   ├── validation.ts    # Joi validation schemas
│   └── index.ts
├── routes/             # Route definitions
│   ├── auth.ts
│   ├── executions.ts
│   ├── workflows.ts
│   └── index.ts        # Main router
└── index.ts            # API module exports
```

## Controllers

### WorkflowController
Handles all workflow-related operations:
- `getAllWorkflows()` - Get all workflows for authenticated user
- `getWorkflowById()` - Get specific workflow
- `createWorkflow()` - Create new workflow
- `updateWorkflow()` - Update existing workflow
- `deleteWorkflow()` - Delete workflow
- `getTemplates()` - Get workflow templates
- `duplicateWorkflow()` - Duplicate a workflow
- `toggleWorkflowActive()` - Activate/deactivate workflow

### ExecutionController
Manages workflow executions:
- `getAllExecutions()` - Get executions with optional filtering
- `getExecutionById()` - Get specific execution details
- `startExecution()` - Start new workflow execution
- `stopExecution()` - Stop running execution
- `retryExecution()` - Retry failed execution
- `getExecutionStats()` - Get execution statistics
- `deleteExecution()` - Delete execution record

### AuthController
Handles authentication operations:
- `register()` - Register new user
- `login()` - User login
- `logout()` - User logout
- `getProfile()` - Get current user profile
- `updateProfile()` - Update user profile
- `changePassword()` - Change password
- `verifyToken()` - Verify JWT token validity

## Middleware

### Error Handler
- `errorHandler()` - Global error handler with proper status codes
- `notFoundHandler()` - 404 handler
- `asyncHandler()` - Async route wrapper
- `ApiError` - Custom error class
- `ErrorFactory` - Error factory methods

### Validation
Uses Joi schemas for request validation:
- **Workflow schemas**: create, update, id
- **Execution schemas**: start, id, query
- **Auth schemas**: register, login, updateProfile, changePassword

## Routes

### Authentication Routes (`/api/auth`)
```
POST   /register         - Register new user
POST   /login           - Login user
POST   /logout          - Logout user
GET    /profile         - Get current user profile
PUT    /profile         - Update user profile
POST   /change-password - Change password
GET    /verify          - Verify token
```

### Workflow Routes (`/api/workflows`)
```
GET    /                     - Get all workflows
GET    /templates            - Get workflow templates
GET    /:id                  - Get workflow by ID
POST   /                     - Create workflow
PUT    /:id                  - Update workflow
DELETE /:id                  - Delete workflow
POST   /:id/duplicate        - Duplicate workflow
PATCH  /:id/toggle-active    - Toggle active status
```

### Execution Routes (`/api/executions`)
```
GET    /              - Get all executions
GET    /stats         - Get execution statistics
GET    /:id           - Get execution by ID
POST   /              - Start new execution
POST   /:id/stop      - Stop execution
POST   /:id/retry     - Retry execution
DELETE /:id           - Delete execution
```

## Authentication & Authorization

### JWT Authentication
All protected routes require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Role-Based Access Control
- **Admin**: Full access to all resources
- **Editor**: Can create, read, update workflows and executions
- **Developer**: Can create, read, update workflows and executions
- **Viewer**: Read-only access

### Permissions
Routes enforce permissions based on:
1. Authentication (valid JWT token)
2. Role authorization (admin, editor, developer, viewer)
3. Resource ownership (users can only modify their own resources)
4. Team access (users can access team resources)

## Error Handling

All errors follow a consistent format:
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "details": {},
  "timestamp": "2025-10-07T12:00:00.000Z"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity
- `500` - Internal Server Error
- `503` - Service Unavailable

## Request Validation

All requests are validated using Joi schemas:

### Create Workflow Example
```json
{
  "name": "My Workflow",
  "description": "Workflow description",
  "nodes": [
    {
      "id": "node-1",
      "type": "http",
      "name": "HTTP Request",
      "parameters": {},
      "position": { "x": 100, "y": 100 }
    }
  ],
  "connections": [],
  "settings": {},
  "tags": ["automation"]
}
```

### Start Execution Example
```json
{
  "workflowId": "uuid",
  "mode": "manual",
  "startData": {}
}
```

## Response Format

All successful responses follow this format:
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "count": 0
}
```

## Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Password Hashing**: bcrypt with salt rounds
3. **Request Validation**: Joi schemas prevent malformed data
4. **Error Sanitization**: No sensitive data in production errors
5. **CORS Configuration**: Configurable CORS policies
6. **Rate Limiting**: Ready for rate limiter integration
7. **Helmet Security**: Security headers via helmet middleware

## Integration

To integrate the API layer into your Express app:

```typescript
import express from 'express';
import { apiRouter, errorHandler, notFoundHandler } from '@/api';

const app = express();

// Mount API routes
app.use('/api', apiRouter);

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(3000);
```

## Dependencies

- **express**: Web framework
- **joi**: Schema validation
- **jsonwebtoken**: JWT authentication
- **bcrypt**: Password hashing
- **express-async-errors**: Automatic error handling

## Future Enhancements

- [ ] Refresh token support
- [ ] OAuth/SSO integration
- [ ] API key authentication
- [ ] Rate limiting implementation
- [ ] GraphQL API layer
- [ ] WebSocket support for real-time updates
- [ ] OpenAPI/Swagger documentation
- [ ] API versioning (v2, v3)
