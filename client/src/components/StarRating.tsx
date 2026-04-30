interface Props {
    value: number;           // current rating (1-5)
    onChange?: (v: number) => void;  // if undefined → read-only mode
    size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' };

export default function StarRating({ value, onChange, size = 'md' }: Props) {
    return (
        <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            disabled={!onChange}
            className={`${sizes[size]} transition
            ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
            ${star <= value ? 'text-amber-400' : 'text-slate-600'}`}
            >
            ★
            </button>
        ))}
        </div>
    );
}
