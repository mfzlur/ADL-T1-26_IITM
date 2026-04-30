import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, ManyToOne, JoinColumn
} from 'typeorm';
import { Masterclass } from './Masterclass';

export enum MaterialType {
    VIDEO       = 'video',
    ARTICLE     = 'article',
    REFERENCE   = 'reference',
    DOCUMENT    = 'document',
    LINK        = 'link',
}

@Entity('class_materials')
export class ClassMaterial {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'enum', enum: MaterialType })
    type!: MaterialType;

    @Column({ type: 'varchar', length: 255 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'text' })
    url!: string;

    @Column({ type: 'int', default: 0 })
    sort_order!: number;

    @CreateDateColumn()
    created_at!: Date;

    // Relations
    @ManyToOne(() => Masterclass, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'masterclass_id' })
    masterclass!: Masterclass;

    @Column({ type: 'uuid' })
    masterclass_id!: string;
}
