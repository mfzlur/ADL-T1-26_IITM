import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn
} from 'typeorm';
import { User }       from './User';
import { Enrollment } from './Enrollment';
import { Review }     from './Review';
import { ClassMaterial } from './ClassMaterial';

export enum ClassCategory {
  OPENING    = 'opening',
  MIDDLEGAME = 'middlegame',
  ENDGAME    = 'endgame',
  TACTICS    = 'tactics',
}

@Entity('masterclasses')
export class Masterclass {

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'timestamp' })
  session_date!: Date;

  @Column({ type: 'enum', enum: ClassCategory })
  category!: ClassCategory;

  @Column({ type: 'int' })
  capacity!: number;

  @Column({ type: 'text', nullable: true })
  media_url!: string | null;

  @Column({ type: 'text', nullable: true })
  video_url!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  // Phase 5A — tracks when a coach last edited this class
  // Enrolled players can compare this against their enrollment date
  // to know if details changed after they signed up
  @UpdateDateColumn()
  updated_at!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.masterclasses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coach_id' })
  coach!: User;

  @Column({ type: 'uuid' })
  coach_id!: string;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.masterclass)
  enrollments!: Enrollment[];

  @OneToMany(() => Review, (review) => review.masterclass)
  reviews!: Review[];

  @OneToMany(() => ClassMaterial, (material) => material.masterclass)
  materials!: ClassMaterial[];
}
