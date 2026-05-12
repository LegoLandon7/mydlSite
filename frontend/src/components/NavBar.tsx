import './NavBar.scss';
import { NavLink } from "react-router-dom";

type navProp = {
    links?: {name: string, link: string}[]; // name, link
};

export default function NavBar( {links = []} : navProp) {
    return (<>

    <nav className='navbar'>
        {links.map(({ name, link }) => ( // map links to navlinks
            <NavLink key={link} to={link}>{name}</NavLink>
        ))}
    </nav>

    </>);
};