import './SiteSection.scss';

type SiteSectionProps = {
    head: string;
    subhead: string;
    imageUrl?: string;
    align?: 'left' | 'right' | 'default';
};

export default function SiteSection({
    head,
    subhead,
    imageUrl,
    align = 'default',
}: SiteSectionProps) {
    return (
        <header className='site-section'>
            {(imageUrl && align === 'default' || align === 'left') && <img src={imageUrl}/>}

            <div className='section-content'>
                <h1>{"" + head}</h1>
                <hr />
                <p>{"" + subhead}</p>
            </div>

            {(imageUrl && align === 'right') && <img src={imageUrl}/>}
        </header>
    );
}
