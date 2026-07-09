import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'School LMS API',
      version: '1.0.0',
      description: 'REST API for School Learning Management System',
    },
    servers: [
      { url: '/api', description: 'API v1' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
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
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
