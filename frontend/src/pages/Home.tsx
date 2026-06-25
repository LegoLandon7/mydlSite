import SiteHeader from '../components/web/SiteHeader';
import Card from '../components/web/Card';
import SiteSection from '../components/web/SiteSection';

import '../util/containers.scss';

import PlaceHolderImage from '../assets/images/placeholder.png';

export default function Home() {
  return (
    <>

    <SiteHeader 
    head="Make Your Own Demon List (MYODL)" 
    subhead="A website to collaborate and track demon progression (THIS WEBSITE IS NO WHERE NEAR DONE AND ALSO USED SOME AI AS WELL (i WILL redo this with ZERO ai once i get this slop site up :) ), I AM STILL LEARNING WEB DEVELOPMENT AND THIS MAY TAKE A WHILE TO FULLY COME OUT AND BE POLISHED" 
    />
    
    <SiteSection
      head="About MYODL"
      subhead="MYODL is a website created to track demon-progression for individual users or entire groups of users! You can track a custom leaderboard for a friend group, Discord server, or any other group of players. MYODL also serves as a platform for users to collaborate and share their demon progression with others publicly. "
      imageUrl={PlaceHolderImage}
    />

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
}
