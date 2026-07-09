import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'School LMS API',
      version: '1.0.0',
      description: 'REST API for School Learning Management System',
    },
    servers: [
      { url: '/api', description: 'Development (local)' },
      { url: 'https://api.school-lms.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from /auth/login',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
          description: 'HTTP-only session cookie set by /auth/login',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            status: { type: 'string', enum: ['ok', 'degraded'] },
            timestamp: { type: 'string', format: 'date-time' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'boolean' },
                uptime: { type: 'integer' },
              },
            },
          },
        },
        DeepHealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'down'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'integer' },
            checks: { type: 'object', additionalProperties: { $ref: '#/components/schemas/CheckResult' } },
          },
        },
        CheckResult: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'error', 'skipped'] },
            latency_ms: { type: 'integer' },
            provider: { type: 'string' },
            error: { type: 'string' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'displayName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8, maxLength: 128, description: 'Must contain uppercase, lowercase, number, and special character' },
            displayName: { type: 'string', minLength: 2, maxLength: 100 },
            role: { type: 'string', enum: ['student', 'teacher', 'admin', 'parent'], default: 'student' },
            phoneNumber: { type: 'string' },
            photoURL: { type: 'string', format: 'uri' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    tags: [
      { name: 'Health', description: 'Service health checks' },
      { name: 'Auth', description: 'Authentication & authorization' },
      { name: 'School', description: 'School management' },
      { name: 'Academics', description: 'Classes, subjects, timetable, attendance' },
      { name: 'Finance', description: 'Fees, payroll, inventory' },
      { name: 'HR', description: 'Staff, teachers, leave management' },
      { name: 'Content', description: 'Assignments, exams, video library, rubrics' },
      { name: 'Infrastructure', description: 'Transport, notices, cloudinary' },
      { name: 'Analytics', description: 'Dashboards and reporting' },
    ],
  },
  apis: [
    path.join(__dirname, '../routes/health.ts'),
    path.join(__dirname, '../routes/auth.routes.ts'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
