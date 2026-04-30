import { useState, type SubmitEvent } from "react";
import api from "../utils/api";
import StarRating from "./StarRating";

interface Props {
  masterclassId: string;
  masterclassTitle: string;
  onClose: () => void;
  onSubmitted: (rating: number, comment: string) => void; // Phase 6G — edit mode props (all optional, defaults to create)
  mode?: "create" | "edit";
  initialRating?: number;
  initialComment?: string;
}

export default function ReviewModal({
  masterclassId,
  masterclassTitle,
  onClose,
  onSubmitted,
  mode = "create",
  initialRating = 0,
  initialComment = "",
}: Props) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEdit = mode === "edit";

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (isEdit) {
        await api.patch(`/reviews/${masterclassId}`, { rating, comment });
      } else {
        await api.post(`/reviews/${masterclassId}`, { rating, comment });
      }
      onSubmitted(rating, comment);

      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? ((err as { response?: { data?: { message?: string } } }).response
              ?.data?.message ?? err.message)
          : `Failed to ${isEdit ? "update" : "submit"} review`;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50
      flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl
        p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-white text-lg">
              {isEdit ? "Edit Your Review" : "Write a Review"}
            </h3>
            <p className="text-slate-400 text-sm mt-0.5">{masterclassTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Star rating */}
          <div className="mb-4">
            <label className="text-sm text-slate-400 block mb-2">
              Your rating
            </label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Comment */}
          <div className="mb-4">
            <label className="text-sm text-slate-400 block mb-2">
              Comment <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              maxLength={500}
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 text-white
                rounded-xl px-4 py-3 text-sm focus:outline-none
                focus:border-emerald-500 transition resize-none"
            />
            <p className="text-slate-600 text-xs mt-1 text-right">
              {comment.length}/500
            </p>
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700
                text-slate-400 hover:text-white hover:border-slate-500
                text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || rating === 0}
              className="flex-1 py-2.5 rounded-xl bg-amber-500
                hover:bg-amber-400 text-slate-950 text-sm font-medium
                transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? isEdit
                  ? "Updating..."
                  : "Submitting..."
                : isEdit
                  ? "Update Review"
                  : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
