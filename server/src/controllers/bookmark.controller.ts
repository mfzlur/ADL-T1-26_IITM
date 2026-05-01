import { Response, Request } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as BookmarkService from '../services/bookmark.service';

// ADDED: typed param interface — removes index-signature widening
interface MasterclassIdParam { masterclassId: string }

// CHANGED: Request<MasterclassIdParam> instead of AuthRequest
// req.params.masterclassId is now definitively string, not string | undefined
export const toggleBookmark = async (
  req: AuthRequest & Request<MasterclassIdParam>,
  res: Response
): Promise<void> => {
  try {
    const result = await BookmarkService.toggleBookmark(
      req.user!.userId,
      req.params.masterclassId  // no cast needed
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
