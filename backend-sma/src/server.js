// src/server.js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.routes.js'
import path from "path";
import { fileURLToPath } from "url";
import storeRoutes from "./routes/store.routes.js";
import warrantyRoutes from "./routes/warranty.routes.js";
// ⬇️ Swagger
import swaggerUi from 'swagger-ui-express'
import swaggerSpec from './docs/swagger.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(cookieParser())

// Swagger UI at /docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }))


app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (_req, res) => res.send('SME Email Auth API - Running OK'))
app.use('/auth', authRoutes)
app.use("/store", storeRoutes);
app.use("/warranties", warrantyRoutes);

const port = Number(process.env.PORT || 4000)
const baseUrl = (process.env.APP_URL && process.env.APP_URL.replace(/\/+$/, '')) || `http://localhost:${port}`

app.listen(port, () => {
  console.log(`🚀 API running on ${baseUrl}`)
  console.log(`📚 Swagger UI -> ${baseUrl}/docs`)
})
