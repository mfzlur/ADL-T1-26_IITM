import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { verifyToken } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { RegisterSchema, LoginSchema } from '../schemas/auth.schemas';

const router = Router();

router.post('/register', validate(RegisterSchema), AuthController.register);
router.post('/login',    validate(LoginSchema),    AuthController.login);
router.get ('/me',       verifyToken,              AuthController.getMe);

export default router;
