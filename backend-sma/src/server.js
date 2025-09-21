// src/server.js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.routes.js'

const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/', (_req, res) => res.send('SME Email Auth API - Running OK'))
app.use('/auth', authRoutes)

const port = Number(process.env.PORT || 4000)
app.listen(port, () => {
  console.log(`🚀 API running on ${process.env.APP_URL || `http://localhost:${port}`}`)
})
