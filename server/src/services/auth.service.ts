import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';

// ── Single module-level repo — used by ALL functions below ────────────
const userRepo = AppDataSource.getRepository(User);

const SALT_ROUNDS = 10;

const generateToken = (user: User): string => {
  return jwt.sign(
    {
      userId: user.id,
      email:  user.email,
      role:   user.role,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
};

// ─── REGISTER ────────────────────────────────────────────────────────
export const register = async (
  name:     string,
  email:    string,
  password: string,
  role:     UserRole
) => {
  const existing = await userRepo.findOne({ where: { email } });
  if (existing) throw new Error('Email already registered');

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // Coaches need admin approval; players are auto-approved
  const is_approved = role === UserRole.PLAYER;

  const user = userRepo.create({ name, email, password_hash, role, is_approved });
  await userRepo.save(user);

  const token = generateToken(user);

  return {
    token,
    user: {
      id:          user.id,
      name:        user.name,
      email:       user.email,
      role:        user.role,
      is_approved: user.is_approved,
    },
  };
};

// ─── LOGIN ───────────────────────────────────────────────────────────
export const login = async (email: string, password: string) => {
  const user = await userRepo.findOne({ where: { email } });
  if (!user) throw new Error('Invalid email or password');

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new Error('Invalid email or password');

  // Block unapproved coaches from logging in
  if (user.role === UserRole.COACH && !user.is_approved) {
    throw new Error('Your coach account is pending admin approval');
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id:          user.id,
      name:        user.name,
      email:       user.email,
      role:        user.role,
      is_approved: user.is_approved,
    },
  };
};

// ─── GET CURRENT USER ────────────────────────────────────────────────
// Uses the module-level userRepo — no second instantiation
export const getMe = async (userId: string) => {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  return {
    id:               user.id,
    name:             user.name,
    email:            user.email,
    role:             user.role,
    is_approved:      user.is_approved,
    created_at:       user.created_at,
    // Phase 1B profile fields
    bio:              user.bio,
    chess_rating:     user.chess_rating,
    experience_level: user.experience_level,
  };
};
