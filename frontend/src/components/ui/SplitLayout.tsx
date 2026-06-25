import './SplitLayout.scss';
import { forwardRef } from 'react';

type SplitLayoutProps = {
    menu: React.ReactNode;
    page: React.ReactNode;
};

const SplitLayout = forwardRef<HTMLDivElement, SplitLayoutProps>(function SplitLayout({ menu, page }, ref) {
    return (
        <div className="split-layout" ref={ref}>
            <section className="split-page">{page}</section>
            <aside className="split-menu">{menu}</aside>
        </div>
    );
});

export default SplitLayout;