import LevelCard from '../components/LevelCard';

export default function Home() {
  return (
    <>
      <h1>MYODL - Make Your Own Demon List</h1>
      <h2>View your demon list!</h2>

      <LevelCard placement={1} aredlPlacement={767}
      title="Bloodbath"
      imageUrl="https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/cards/10565740.webp"/>
      <LevelCard placement={2} aredlPlacement={1208}
      title="Reanimate"
      imageUrl="https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/cards/80335620.webp"/>
    </>
  );
}
