import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../entities/User';
import { Masterclass } from '../entities/Masterclass';
import { Enrollment } from '../entities/Enrollment';
import { Review } from '../entities/Review';
import { Notification } from '../entities/Notification';
import { Bookmark } from '../entities/Bookmark';
import { ClassMaterial } from '../entities/ClassMaterial';
import { FavoriteCoach } from '../entities/FavoriteCoach';
import { KickRequest } from '../entities/KickRequest';


dotenv.config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true,   // ⚠️ auto-creates tables — fine for dev, turn OFF in production
    logging: false,
    entities: [User, Masterclass, Enrollment, Review, Notification, Bookmark, ClassMaterial, FavoriteCoach, KickRequest],
    migrations: [__dirname + '/../migrations/*.ts'],
});
