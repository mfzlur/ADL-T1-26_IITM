import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, ManyToOne, JoinColumn, Unique
} from 'typeorm';
import { User } from './User';
import { Masterclass } from './Masterclass';

@Entity('bookmarks')
@Unique(['user_id', 'masterclass_id'])   // one bookmark per user per class
export class Bookmark {

    @PrimaryGeneratedColumn()
    id!: number;

    @CreateDateColumn()
    created_at!: Date;

    // Relations
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'uuid' })
    user_id!: string;

    @ManyToOne(() => Masterclass, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'masterclass_id' })
    masterclass!: Masterclass;

    @Column({ type: 'uuid' })
    masterclass_id!: string;
}
