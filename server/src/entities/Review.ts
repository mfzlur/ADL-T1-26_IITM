import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, ManyToOne, JoinColumn, Unique
} from 'typeorm';
import { User } from './User';
import { Masterclass } from './Masterclass';

@Entity('reviews')
@Unique(['player_id', 'masterclass_id'])   // one review per player per class
export class Review {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'smallint' })
    rating!: number;           // 1 to 5 stars

    @Column({ type: 'text', nullable: true })
    comment!: string | null;

    @CreateDateColumn()
    created_at!: Date;

    // Relations
    @ManyToOne(() => User, (user) => user.reviews, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'player_id' })
    player!: User;

    @Column({ type: 'uuid' })
    player_id!: string;

    @ManyToOne(() => Masterclass, (masterclass) => masterclass.reviews, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'masterclass_id' })
    masterclass!: Masterclass;

    @Column({ type: 'uuid' })
    masterclass_id!: string;
}
