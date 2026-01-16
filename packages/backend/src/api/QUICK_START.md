# Orchestra API - Quick Start Guide

Get up and running with the Orchestra API in 5 minutes.

## 1. Setup

```bash
cd packages/backend
npm install
```

## 2. Configure Environment

Create `.env` file:
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=orchestra
DB_USER=postgres
DB_PASSWORD=yourpassword

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=7d

# Auth
DISABLE_AUTH=false
ENCRYPTION_KEY=your-encryption-key-32-chars-min
```

## 3. Start Server

```bash
npm run dev
```

## 4. Test the API

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "editor"
    },
    "token": "jwt-token-here"
  },
  "message": "User registered successfully"
}
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### Create a Workflow
```bash
curl -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My First Workflow",
    "description": "A simple test workflow",
    "nodes": [
      {
        "id": "start-node",
        "type": "trigger",
        "name": "Start",
        "parameters": {},
        "position": { "x": 100, "y": 100 }
      }
    ],
    "connections": [],
    "tags": ["test"]
  }'
```

### Start an Execution
```bash
curl -X POST http://localhost:3000/api/executions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "workflowId": "WORKFLOW_UUID",
    "mode": "manual"
  }'
```

### Get Workflow Executions
```bash
curl http://localhost:3000/api/executions?workflowId=WORKFLOW_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 5. API Structure

```
POST   /api/auth/register           - Register
POST   /api/auth/login             - Login
GET    /api/auth/profile           - Get profile
PUT    /api/auth/profile           - Update profile
POST   /api/auth/change-password   - Change password

GET    /api/workflows              - List workflows
POST   /api/workflows              - Create workflow
GET    /api/workflows/:id          - Get workflow
PUT    /api/workflows/:id          - Update workflow
DELETE /api/workflows/:id          - Delete workflow
POST   /api/workflows/:id/duplicate - Duplicate
PATCH  /api/workflows/:id/toggle-active - Toggle active

GET    /api/executions             - List executions
POST   /api/executions             - Start execution
GET    /api/executions/:id         - Get execution
POST   /api/executions/:id/stop    - Stop execution
POST   /api/executions/:id/retry   - Retry execution
GET    /api/executions/stats       - Get statistics
```

## 6. Authentication

All protected endpoints require JWT token:
```
Authorization: Bearer <your-jwt-token>
```

Get token from `/api/auth/register` or `/api/auth/login`.

## 7. Error Handling

All errors return consistent format:
```json
{
  "error": "Error Type",
  "message": "Description",
  "timestamp": "2025-10-07T12:00:00.000Z"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

## 8. Development Tips

### Use a REST client
- **Postman**: Import OpenAPI spec
- **Insomnia**: Great for GraphQL too
- **VS Code REST Client**: Use `.http` files

### Enable debug logging
```env
LOG_LEVEL=debug
```

### Disable auth for development
```env
DISABLE_AUTH=true
```
⚠️ Never use in production!

### Hot reload
```bash
npm run dev  # Uses tsx watch for hot reload
```

## 9. Common Workflows

### Create and Execute a Workflow
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}' \
  | jq -r '.data.token')

# 2. Create workflow
WORKFLOW_ID=$(curl -s -X POST http://localhost:3000/api/workflows \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","nodes":[],"connections":[]}' \
  | jq -r '.data.id')

# 3. Start execution
curl -X POST http://localhost:3000/api/executions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"workflowId\":\"$WORKFLOW_ID\",\"mode\":\"manual\"}"
```

## 10. Next Steps

- 📖 Read [API README](./README.md) for detailed documentation
- 🧪 Write tests for your workflows
- 🔧 Customize controllers for your needs
- 📊 Set up monitoring and logging
- 🚀 Deploy to production

## Troubleshooting

### "Unauthorized" error
- Check JWT token is valid and not expired
- Ensure `Authorization: Bearer TOKEN` header is set
- Verify user is active in database

### "Validation Error"
- Check request body matches schema
- Ensure all required fields are present
- Verify data types are correct

### Database connection error
- Verify database is running
- Check `.env` database credentials
- Ensure database exists

### Port already in use
- Change PORT in `.env`
- Or kill process: `lsof -ti:3000 | xargs kill`

## Support

- 📧 Email: support@orchestra.com
- 💬 Discord: discord.gg/orchestra
- 📚 Docs: docs.orchestra.com
- 🐛 Issues: github.com/orchestra/issues
