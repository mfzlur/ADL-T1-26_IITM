import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, ManyToOne, JoinColumn
} from 'typeorm';
import { User } from './User';

export enum NotificationType {
    WAITLIST_PROMOTED = 'waitlist_promoted',
    CLASS_UPDATED     = 'class_updated',
    CLASS_CANCELLED   = 'class_cancelled',
    REVIEW_RECEIVED   = 'review_received',
    ENROLLMENT_NEW    = 'enrollment_new',
    ENROLLMENT_CANCELLED = 'enrollment_cancelled',
    NEW_CLASS_FROM_FAVORITE = 'new_class_from_favorite',
    KICK_REQUEST_APPROVED = 'kick_request_approved',
    KICK_REQUEST_REJECTED = 'kick_request_rejected',
    KICKED_FROM_CLASS = 'kicked_from_class',
    KICK_REQUEST_PENDING = 'kick_request_pending',
}

@Entity('notifications')
export class Notification {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'enum', enum: NotificationType })
    type!: NotificationType;

    @Column({ type: 'varchar', length: 200 })
    title!: string;

    @Column({ type: 'text' })
    message!: string;

    @Column({ type: 'boolean', default: false })
    is_read!: boolean;

    @CreateDateColumn()
    created_at!: Date;

    // Relations
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'uuid' })
    user_id!: string;
}
