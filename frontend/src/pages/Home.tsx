import LevelCard from '../components/LevelCard';
import SiteHeader from '../components/SiteHeader';

export default function Home() {
  return (
    <>
      <SiteHeader 
      head="Personal Demon List" 
      subhead="A list of your personal demon-completions" />

      <LevelCard placement={1} aredlPlacement={767}
      title="Bloodbath"
      imageUrl="https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/cards/10565740.webp"/>

      <LevelCard placement={2} aredlPlacement={1208}
      title="Reanimate"
      imageUrl="https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/cards/80335620.webp"/>

      <LevelCard />
    </>
  );
}
