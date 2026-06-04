import './SiteHeader.scss';

type SiteHeaderProps = {
    head?: string;
    subhead?: string;
};

export default function SiteHeader({
    head = "head",
    subhead = "subhead"
}: SiteHeaderProps) {
    return (
        <div className="site-header">
            <h1>{head}</h1>
            <h3>{subhead}</h3>
            <hr />
        </div>
    );
}