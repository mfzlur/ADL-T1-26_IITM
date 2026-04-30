import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as AuthService from '../services/auth.service';
import { UserRole } from '../entities/User';
import { RegisterBody, LoginBody } from '../schemas/auth.schemas';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // req.body is typed and guaranteed valid by validate(RegisterSchema)
    const { name, email, password, role } = req.body as RegisterBody;
    const result = await AuthService.register(name, email, password, role as UserRole);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginBody;
    const result = await AuthService.login(email, password);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(401).json({ message: err.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await AuthService.getMe(req.user!.userId);
    res.status(200).json(user);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};
