import './SplitLayout.scss';
import { useRef } from 'react';

type SplitLayoutProps = {
    menu: React.ReactNode;
    page: React.ReactNode;
};

export default function SplitLayout({ menu, page }: SplitLayoutProps) {
    const ref = useRef<HTMLDivElement>(null);
    return (
        <div className="split-layout" ref={ref}>
            <aside className="split-menu">{menu}</aside>
            <section className="split-page">{page}</section>
        </div>
    );
}
