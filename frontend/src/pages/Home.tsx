import LevelCard from '../components/LevelCard';
import SiteHeader from '../components/SiteHeader';
import Card from '../components/Card';

import '../util/containers.scss';

export default function Home() {
  return (
    <>

    <SiteHeader 
    head="Make Your Own Demon List (MYODL)" 
    subhead="A website to collaberate and track demon progression" />

    <div className="flex-row">
      <Card
      title="AREDL Website"
      description="This website is heavily imspired by the All Rated Extreme Demon List (AREDL) and serves as an extension to it. This website does not claim to replace or copy AREDL in any way. Check out the AREDL website for the original list and more information about it!"
      imageUrl="https://aredl.net/favicon.ico"
      linkUrl="https://aredl.net/"
      newTab={true}/>

      <Card
      title="Github Repository"
      description="Check out our GitHub repository for the latest updates and contributions. Feel free to contribute towards our website!"
      imageUrl="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
      linkUrl="https://github.com/"
      newTab={true}/>
    </div>
    

    </>
  );

  // return (
  //   <>
  //     <SiteHeader 
  //     head="Personal Demon List" 
  //     subhead="A list of your personal demon completions" />

  //     <LevelCard placement={1} aredlPlacement={767}
  //     title="Bloodbath"
  //     imageUrl="https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/cards/10565740.webp"/>

  //     <LevelCard placement={2} aredlPlacement={1208}
  //     title="Reanimate"
  //     imageUrl="https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/cards/80335620.webp"/>

  //     <LevelCard />
  //   </>
  // );
}
