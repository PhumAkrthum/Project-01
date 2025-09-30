// src/docs/swagger.js
import swaggerJsdoc from 'swagger-jsdoc';

const port = process.env.PORT || 4000;
const serverUrl = process.env.APP_URL || `http://localhost:${port}`;

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SME Auth API',
      version: '1.0.0',
      description: 'เอกสาร API สมัคร/ยืนยันอีเมล/ล็อกอิน/รีเซ็ตรหัสผ่าน',
    },
    servers: [{ url: serverUrl }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: { message: { type: 'string' } },
        },
      },
    },
  },
  // ให้ค้นคอมเมนต์ JSDoc ในไฟล์ route/controller
  apis: ['./src/routes/**/*.js', './src/controllers/**/*.js'],
};

export default swaggerJsdoc(options);
