import './PageTabs.scss';

type Tab = { key: string; label: string };

type PageTabsProps = {
    tabs: Tab[];
    active: string;
    onSelect: (key: string) => void;
    right?: React.ReactNode;
};

export default function PageTabs({ tabs, active, onSelect, right }: PageTabsProps) {
    return (
        <div className="page-tabs-bar">
            <div className="tabs">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        className={active === t.key ? 'active' : ''}
                        onClick={() => onSelect(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            {right && <div className="tabs-right">{right}</div>}
        </div>
    );
}
