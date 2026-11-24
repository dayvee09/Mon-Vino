import "./PiedDePage.scss";
import { NavLink } from "react-router-dom";
import SiteHomeLink from "./SiteHomeLink";

/**
 * Le pied de page
 * @date 2022-09-30
 * @param {*} props
 * @returns {*}
 */
export default function PiedDePage(props) {
	const anneeCourante = new Date().getFullYear();

	return (
		<div className="PiedDePage">
			<div className="PiedDePage__meta">
				<p className="PiedDePage__copyright">
					© Mon Vino {anneeCourante}, Tous droits réservés
				</p>
				<SiteHomeLink tone="on-dark" className="PiedDePage__home" />
			</div>
			<NavLink to="/aide" className="nav-link-help">
				Aide
			</NavLink>
		</div>
	);
}