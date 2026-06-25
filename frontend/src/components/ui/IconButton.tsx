import './IconButton.scss';

type IconButtonProps = {
    onClick: () => void;
    children: React.ReactNode;
    variant?: 'default' | 'accent';
    title?: string;
};

export default function IconButton({ onClick, children, variant = 'default', title }: IconButtonProps) {
    return (
        <button className={`icon-btn ${variant}`} onClick={onClick} title={title}>
            {children}
        </button>
    );
}
