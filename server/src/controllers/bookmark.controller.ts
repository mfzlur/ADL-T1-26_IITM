import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as BookmarkService from '../services/bookmark.service';

export const toggleBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await BookmarkService.toggleBookmark(
      req.user!.userId,
      req.params.masterclassId
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getMyBookmarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookmarks = await BookmarkService.getUserBookmarks(req.user!.userId);
    res.json(bookmarks);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getMyBookmarkIds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ids = await BookmarkService.getUserBookmarkIds(req.user!.userId);
    res.json(ids);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
