import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import contactRoute from './routes/contactRoute.js';
import authRoute from './routes/authRoute.js';
import checkAuth from './middleware/checkAuth.js';

// Load biến môi trường từ file .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Route public
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bitrix24 Contact Manager API',
    version: '1.0.0'
  });
});

// Routes xác thực OAuth
app.use('/auth', authRoute);

// Routes bảo vệ bởi xác thực
app.use('/api/contact', checkAuth(), contactRoute);

// Middleware xử lý lỗi 404
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.url);
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'The requested resource was not found'
  });
});

// Middleware xử lý lỗi toàn cục
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred'
  });
});

app.listen(PORT, () => {
  console.log(`Server đang chạy trên port ${PORT}`);
  console.log(`Môi trường: ${process.env.NODE_ENV || 'development'}`);
});