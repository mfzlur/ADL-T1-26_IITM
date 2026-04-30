import { Router } from 'express';
import * as BookmarkController from '../controllers/bookmark.controller';
import { verifyToken } from '../middlewares/auth';

const router = Router();

router.get('/', verifyToken, BookmarkController.getMyBookmarks);
router.get('/ids', verifyToken, BookmarkController.getMyBookmarkIds);
router.post('/:masterclassId', verifyToken, BookmarkController.toggleBookmark);

export default router;
