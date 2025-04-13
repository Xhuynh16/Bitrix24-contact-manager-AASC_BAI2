import express from 'express';
import cors from 'cors';
import contactRoute from './routes/contactRoute.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.json({ message: 'Server đang hoạt động!' });
});

app.use('/api/contact', contactRoute);

app.listen(PORT, () => {
  console.log(`Server đang chạy trên port ${PORT}`);
});