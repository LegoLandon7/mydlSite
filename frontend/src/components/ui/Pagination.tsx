import './Pagination.scss';

type PaginationProps = {
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
};

export default function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
    if (totalPages <= 1) return null;
    return (
        <div className="pagination">
            <button disabled={page === 0} onClick={onPrev}>←</button>
            <span>{page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={onNext}>→</button>
        </div>
    );
}
