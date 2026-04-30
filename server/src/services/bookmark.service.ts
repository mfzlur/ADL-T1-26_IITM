import { AppDataSource } from '../config/database';
import { Bookmark } from '../entities/Bookmark';

const bookmarkRepo = AppDataSource.getRepository(Bookmark);

// ─── TOGGLE (add or remove) ─────────────────────────────────────────
export const toggleBookmark = async (userId: string, masterclassId: string) => {
  const existing = await bookmarkRepo.findOne({
    where: { user_id: userId, masterclass_id: masterclassId },
  });

  if (existing) {
    await bookmarkRepo.remove(existing);
    return { bookmarked: false, message: 'Bookmark removed' };
  }

  const bookmark = bookmarkRepo.create({
    user_id: userId,
    masterclass_id: masterclassId,
  });
  await bookmarkRepo.save(bookmark);
  return { bookmarked: true, message: 'Bookmark added' };
};

// ─── GET USER BOOKMARKS ─────────────────────────────────────────────
export const getUserBookmarks = async (userId: string) => {
  return await bookmarkRepo.find({
    where: { user_id: userId },
    relations: ['masterclass', 'masterclass.coach'],
    order: { created_at: 'DESC' },
  });
};

// ─── CHECK IF BOOKMARKED ────────────────────────────────────────────
export const getUserBookmarkIds = async (userId: string): Promise<string[]> => {
  const bookmarks = await bookmarkRepo.find({
    where: { user_id: userId },
    select: ['masterclass_id'],
  });
  return bookmarks.map(b => b.masterclass_id);
};
