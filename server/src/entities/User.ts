import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, OneToMany
} from 'typeorm';
import { Masterclass } from './Masterclass';
import { Enrollment } from './Enrollment';
import { Review } from './Review';

export enum UserRole {
    ADMIN  = 'admin',
    COACH  = 'coach',
    PLAYER = 'player',
}

export enum ExperienceLevel {
    BEGINNER = 'beginner',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced',
    MASTER = 'master'
}

@Entity('users')
export class User {

    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 100 })
    name!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email!: string;

    @Column({ type: 'text' })
    password_hash!: string;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.PLAYER })
    role!: UserRole;

    @Column({ type: 'boolean', default: false })
    is_approved!: boolean;

    @Column({ type: 'text', nullable: true })
    bio!: string | null;

    @Column({ type: 'int', nullable: true })
    chess_rating!: number | null;

    @Column({ type: 'enum', enum: ExperienceLevel, nullable: true })
    experience_level!: ExperienceLevel | null;

    @CreateDateColumn()
    created_at!: Date;

    // Relations
    @OneToMany(() => Masterclass, (masterclass) => masterclass.coach)
    masterclasses!: Masterclass[];

    @OneToMany(() => Enrollment, (enrollment) => enrollment.player)
    enrollments!: Enrollment[];

    @OneToMany(() => Review, (review) => review.player)
    reviews!: Review[];
}
