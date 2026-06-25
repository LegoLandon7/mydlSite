import './MenuSearch.scss';
import SearchIcon from '../../assets/icons/search.svg';

type MenuSearchProps = {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
};

export default function MenuSearch({ value, onChange, placeholder = 'Search...' }: MenuSearchProps) {
    return (
        <div className="menu-search">
            <img src={SearchIcon} alt="" />
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );
}
