import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, ManyToOne, JoinColumn, Unique
} from 'typeorm';
import { User } from './User';
import { Masterclass } from './Masterclass';

export enum EnrollmentStatus {
    ACTIVE     = 'active',
    WAITLISTED = 'waitlisted',
}

@Entity('enrollments')
@Unique(['player_id', 'masterclass_id'])   // one enrollment per player per class
export class Enrollment {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.ACTIVE })
    status!: EnrollmentStatus;

    @CreateDateColumn()
    enrolled_at!: Date;

    // Relations
    @ManyToOne(() => User, (user) => user.enrollments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'player_id' })
    player!: User;

    @Column({ type: 'uuid' })
    player_id!: string;

    @ManyToOne(() => Masterclass, (masterclass) => masterclass.enrollments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'masterclass_id' })
    masterclass!: Masterclass;

    @Column({ type: 'uuid' })
    masterclass_id!: string;
}
