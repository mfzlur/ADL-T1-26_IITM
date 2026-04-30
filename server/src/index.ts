import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import authRoutes from './routes/auth.routes';
import path from 'path';
import masterclassRoutes from './routes/masterclass.routes';
import enrollmentRoutes from './routes/enrollment.routes';
import adminRoutes from './routes/admin.routes';
import reviewRoutes from './routes/review.routes';

import analyticsRoutes from './routes/analytics.routes';
import profileRoutes from './routes/profile.routes';
import notificationRoutes from './routes/notification.routes';
import bookmarkRoutes from './routes/bookmark.routes';
import materialRoutes from './routes/material.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);   // ← ADD

app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api/masterclasses', masterclassRoutes);


app.use('/api/enrollments', enrollmentRoutes);

app.use('/api/admin', adminRoutes);

app.use('/api/reviews', reviewRoutes);

app.use('/api/analytics', analyticsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/materials', materialRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Chess Arena API running!' });
});

AppDataSource.initialize()
.then(() => {
    console.log('✅ PostgreSQL connected via TypeORM');
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
})
.catch((err) => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
});
