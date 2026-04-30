import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './User';

@Entity('favorite_coaches')
@Unique(['player_id', 'coach_id'])
export class FavoriteCoach {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    player_id!: string;

    @Column('uuid')
    coach_id!: string;

    @CreateDateColumn()
    created_at!: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'player_id' })
    player!: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'coach_id' })
    coach!: User;
}
