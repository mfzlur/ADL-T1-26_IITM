import { useEffect, useState } from 'react';
import api from '../utils/api';
import StarRating from './StarRating';

interface Review {
    id: number;
    rating: number;
    comment: string | null;
    created_at: string;
    player_name: string;
}

interface ReviewData {
    masterclass_title: string;
    total_reviews: number;
    average_rating: number;
    reviews: Review[];
}

export default function ReviewsList({ masterclassId }: { masterclassId: string }) {
    const [data, setData]     = useState<ReviewData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/reviews/${masterclassId}`)
        .then(r => setData(r.data))
        .finally(() => setLoading(false));
    }, [masterclassId]);

    if (loading) return (
        <div className="animate-pulse space-y-3">
        {[1,2,3].map(i => (
            <div key={i} className="bg-slate-800 h-16 rounded-xl" />
        ))}
        </div>
    );

    if (!data || data.total_reviews === 0) return (
        <div className="text-center py-8 text-slate-500">
        <p className="text-3xl mb-2">★</p>
        <p className="text-sm">No reviews yet. Be the first!</p>
        </div>
    );

    return (
        <div>
        {/* Summary */}
        <div className="flex items-center gap-4 mb-5 p-4 bg-slate-800
        rounded-xl border border-slate-700">
        <div className="text-center">
        <p className="text-4xl font-bold text-amber-400">
        {data.average_rating}
        </p>
        <StarRating value={Math.round(data.average_rating)} size="sm" />
        <p className="text-slate-500 text-xs mt-1">
        {data.total_reviews} review{data.total_reviews !== 1 ? 's' : ''}
        </p>
        </div>

        {/* Rating bar breakdown */}
        <div className="flex-1 space-y-1.5">
        {[5,4,3,2,1].map(star => {
            const count = data.reviews.filter(r => r.rating === star).length;
            const pct   = data.total_reviews > 0
            ? (count / data.total_reviews) * 100 : 0;
            return (
                <div key={star} className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 w-4">{star}</span>
                <span className="text-amber-400 text-xs">★</span>
                <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                <div
                className="bg-amber-400 h-1.5 rounded-full transition-all"
                style={{ width: `${pct}%` }}
                />
                </div>
                <span className="text-slate-500 w-4">{count}</span>
                </div>
            );
        })}
        </div>
        </div>

        {/* Individual reviews */}
        <div className="space-y-3">
        {data.reviews.map(review => (
            <div key={review.id}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
            <div>
            <p className="text-sm font-medium text-white">
            {review.player_name}
            </p>
            <StarRating value={review.rating} size="sm" />
            </div>
            <p className="text-slate-500 text-xs">
            {new Date(review.created_at).toLocaleDateString()}
            </p>
            </div>
            {review.comment && (
                <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                {review.comment}
                </p>
            )}
            </div>
        ))}
        </div>
        </div>
    );
}
