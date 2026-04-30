import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Masterclass } from './Masterclass';

export enum KickRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

@Entity('kick_requests')
export class KickRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  coach_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'coach_id' })
  coach!: User;

  @Column()
  player_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'player_id' })
  player!: User;

  @Column()
  masterclass_id!: string;

  @ManyToOne(() => Masterclass)
  @JoinColumn({ name: 'masterclass_id' })
  masterclass!: Masterclass;

  @Column('text')
  reason!: string;

  @Column({
    type: 'varchar',
    default: KickRequestStatus.PENDING
  })
  status!: KickRequestStatus;

  @CreateDateColumn()
  created_at!: Date;
}
