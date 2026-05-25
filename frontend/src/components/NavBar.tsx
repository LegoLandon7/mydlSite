import './NavBar.scss';
import { NavLink } from "react-router-dom";

type navProp = {
    links?: {name: string, link: string}[]; // name, link
};

export default function NavBar( {links = []} : navProp) {
    return (<>

    <nav className='navbar'>

        <div className='nav-left'>

            {links.map(({ name, link }) => ( // map links to navlinks
                <NavLink key={link} to={link}>{name}</NavLink>
            ))}
            
        </div>

        <div className='nav-right'>

            {links.map(({ name, link }) => ( // map links to navlinks
                <NavLink key={link} to={link}>{name}</NavLink>
            ))}

        </div>

        
    
    </nav>

    </>);
};