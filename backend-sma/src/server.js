// src/server.js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'

import authRoutes from './routes/auth.routes.js'
import storeRoutes from './routes/store.routes.js'
import warrantyRoutes from './routes/warranty.routes.js'

// Swagger
import swaggerUi from 'swagger-ui-express'
import swaggerSpec from './docs/swagger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// ✅ CORS: อนุญาตส่ง Authorization + credentials
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.get('/', (_req, res) => res.send('SME Email Auth API - Running OK'))

// routes
app.use('/auth', authRoutes)
app.use('/store', storeRoutes)
app.use('/warranties', warrantyRoutes)

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('GlobalError:', err)
  const code = err.status || 500
  const msg = err.message || 'Server error'
  res.status(code).json({ message: msg })
})

const port = Number(process.env.PORT || 4000)
const baseUrl =
  (process.env.APP_URL && process.env.APP_URL.replace(/\/+$/, '')) ||
  `http://localhost:${port}`

app.listen(port, () => {
  console.log(`🚀 API running on ${baseUrl}`)
  console.log(`📚 Swagger UI -> ${baseUrl}/docs`)
})
