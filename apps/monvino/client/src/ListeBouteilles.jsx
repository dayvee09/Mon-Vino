import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ListeBouteilles.scss";
import Bouteille from "./Bouteille";
import Chargement from "./Chargement";
import { NavLink, useNavigate, useParams, useLocation } from "react-router-dom";
import rowIcone from "./img/svg/icone_row_left_white_filled.svg";
import addBottleIcone from "./img/svg/add_bottle_blue_filled.svg";

const PAGE_SIZE = 48;

const OPTIONS_TRI = [
  { value: "tout", label: "Tout" },
  { value: "vin-rouge", label: "Vin Rouge" },
  { value: "vin-blanc", label: "Vin Blanc" },
  { value: "vin-rose", label: "Vin Rosé" },
  { value: "qt-decroissante", label: "Quantité décroissante" },
  { value: "qt-croissante", label: "Quantité croissante" },
  { value: "prix-decroissant", label: "Prix-décroissant" },
  { value: "prix-croissant", label: "Prix-croissant" },
  { value: "alph-decroissant", label: "Nom décroissant" },
  { value: "alph-croissant", label: "Nom croissant" },
];

/**
 * L'affichage de la liste des bouteilles
 *
 * Contenant le tri par la différent condition
 * @date 2022-09-30
 * @param {*} props
 * @returns {*}
 */
function ListeBouteilles(props) {
  const { idCellier: idCellierParam, cible: cibleParam } = useParams();
  const cible = cibleParam || props.cible;
  const navigate = useNavigate();
  const location = useLocation();
  const cellierId = idCellierParam || props.cellier;
  const bouteilles = Array.isArray(props.bouteilles) ? props.bouteilles : [];
  const [debut, setDebut] = useState(0);
  const [fin, setFin] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(
    () => !props.hasCachedBouteilles?.(cellierId)
  );
  /**
   *  État des bouteilles au tri
   */
  const [unique, setUnique] = useState(false);
  const [sortType, setSortType] = useState("tout");
  const [triOuvert, setTriOuvert] = useState(false);
  const triRef = useRef(null);
  let indexBouteille = 0;
  if (bouteilles.length > 0) {
    indexBouteille = bouteilles.findIndex((object) => {
      return object && object.id === cible;
    });
  }
  const bouteillesTri = useMemo(() => {
    switch (sortType) {
      case "qt-decroissante":
        return [...bouteilles].sort(
          (a, b) => parseInt(b.quantite) - parseInt(a.quantite)
        );
      case "qt-croissante":
        return [...bouteilles].sort(
          (a, b) => parseInt(a.quantite) - parseInt(b.quantite)
        );
      case "prix-decroissant":
        return [...bouteilles].sort(
          (a, b) => parseInt(b.prix_saq) - parseInt(a.prix_saq)
        );
      case "prix-croissant":
        return [...bouteilles].sort(
          (a, b) => parseInt(a.prix_saq) - parseInt(b.prix_saq)
        );
      case "alph-decroissant":
        return [...bouteilles]
          .filter((b) => b && b.nom)
          .sort((a, b) => b.nom.localeCompare(a.nom));
      case "alph-croissant":
        return [...bouteilles]
          .filter((b) => b && b.nom)
          .sort((a, b) => a.nom.localeCompare(b.nom));
      case "vin-rouge":
        return bouteilles.filter((b) => b?.type === "Vin rouge");
      case "vin-blanc":
        return bouteilles.filter((b) => b?.type === "Vin blanc");
      case "vin-rose":
        return bouteilles.filter((b) => b?.type === "Vin rose");
      default:
        return bouteilles;
    }
  }, [sortType, bouteilles]);

  // Ownership check only — does not reload bottles when celliers list updates.
  useEffect(() => {
    if (!cellierId || !/^\d+$/.test(String(cellierId))) {
      navigate("/", { replace: true });
      return;
    }
    if (
      Array.isArray(props.celliers) &&
      props.celliers.length > 0 &&
      !props.celliers.some((c) => String(c.id) === String(cellierId))
    ) {
      navigate("/", { replace: true });
    }
  }, [cellierId, props.celliers, navigate]);

  useEffect(() => {
    if (!cellierId || !/^\d+$/.test(String(cellierId))) {
      return;
    }

    let cancelled = false;

    async function loadCellier() {
      if (props.gererCellier) {
        props.gererCellier(cellierId);
      }
      if (location.state?.nom && props.setNomCellier) {
        props.setNomCellier({ nom: location.state.nom });
      }
      const hasCache = props.hasCachedBouteilles?.(cellierId);
      if (!hasCache) {
        setLoading(true);
      }
      const result = await props.fetchVins(cellierId);
      if (cancelled) return;
      if (!result?.ok) {
        navigate("/", { replace: true });
        return;
      }
      if (!location.state?.nom) {
        props.fetchNomCellier(cellierId);
      }
      setSortType("tout");
      setDebut(0);
      setFin(PAGE_SIZE);
      setLoading(false);
    }

    loadCellier();

    return () => {
      cancelled = true;
    };
    // Intentionally only cellierId — celliers ownership is handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellierId]);

  useEffect(() => {
    if (!triOuvert) return;

    function fermerTri(e) {
      if (triRef.current && !triRef.current.contains(e.target)) {
        setTriOuvert(false);
      }
    }

    function fermerSurEchap(e) {
      if (e.key === "Escape") setTriOuvert(false);
    }

    document.addEventListener("mousedown", fermerTri);
    document.addEventListener("keydown", fermerSurEchap);
    return () => {
      document.removeEventListener("mousedown", fermerTri);
      document.removeEventListener("keydown", fermerSurEchap);
    };
  }, [triOuvert]);

  const labelTri =
    OPTIONS_TRI.find((option) => option.value === sortType)?.label ?? "Tout";

  // Jump to the bottle highlighted from inventaire stocks. Scroll the .Appli
  // scrollport (not window) — window.scrollTo is a no-op inside the mobile shell
  // and used to leave inventaire's scroll offset clipping the header.
  useEffect(() => {
    if (!cible || unique) return;
    const cibleElt = document.querySelector(`[data-id="${cible}"]`);
    if (!cibleElt) {
      if (bouteilles.length > PAGE_SIZE) setUnique(true);
      return;
    }
    const scroller = cibleElt.closest(".Appli");
    if (!scroller) return;
    const offset =
      cibleElt.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop;
    // Bottle already on the first screen — pin to top so the header stays visible.
    if (offset < scroller.clientHeight * 0.4) {
      scroller.scrollTop = 0;
      return;
    }
    scroller.scrollTo({ top: Math.max(0, offset - 8), behavior: "smooth" });
  }, [props.bouteilles, cible, unique, bouteilles.length]);

  useEffect(() => {
    if (cible && bouteilles.length > PAGE_SIZE && indexBouteille >= PAGE_SIZE) {
      setDebut(indexBouteille);
    }
  }, [unique]);

  useEffect(() => {
    if (cible && bouteilles.length > PAGE_SIZE && indexBouteille >= PAGE_SIZE) {
      setFin(debut + 1);
    }
  }, [debut]);

  function gererVoirPlus() {
    if (bouteilles.length > fin) {
      setFin(fin + PAGE_SIZE);
    } else if (bouteilles.length <= fin) {
      setFin(bouteilles.length);
    }
  }
  const nomAffiche =
    props.nomCellier?.nom ?? location.state?.nom ?? "Cellier";

  return (
      <div>
        <div className="Appli--entete">
          <div className="Appli--tri-container">
            <NavLink to={`/`}>
              <button className="retour">
                <img src={rowIcone} alt="icone-row-left" width={15}></img>
                Retour&nbsp;aux&nbsp;Celliers&nbsp;
              </button>
            </NavLink>
            {!loading && bouteilles.length > 1 && (
              <div className="tri" ref={triRef}>
                <button
                  type="button"
                  className="tri__bouton"
                  id="tri"
                  aria-label="tri"
                  aria-haspopup="listbox"
                  aria-expanded={triOuvert}
                  onClick={() => setTriOuvert((ouvert) => !ouvert)}
                >
                  {labelTri}
                </button>
                {triOuvert && (
                  <ul
                    className="tri__liste"
                    role="listbox"
                    aria-labelledby="tri"
                  >
                    {OPTIONS_TRI.map((option) => (
                      <li
                        key={option.value}
                        role="option"
                        aria-selected={sortType === option.value}
                        className={
                          sortType === option.value
                            ? "tri__option tri__option--selected"
                            : "tri__option"
                        }
                        onClick={() => {
                          setSortType(option.value);
                          setTriOuvert(false);
                        }}
                      >
                        {option.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="Appli--container">
          <h1 className="ListeBouteille--cellier-nom">{nomAffiche}</h1>
          {loading ? (
            <Chargement message="Chargement du cellier…" />
          ) : (
          <div
            className={
              bouteilles.length == 1
                ? "ListeBouteilles"
                : "ListeBouteilles--default"
            }
          >
            <div></div>
            {bouteilles.length > 1 && bouteillesTri.length > 0 && (
              <div className="ListeBouteille--grid">
                {bouteillesTri.slice(debut, fin).map((bouteille) => (
                  <div key={bouteille.id}>
                    <Bouteille
                      {...bouteille}
                      onBouteillePatched={props.onBouteillePatched}
                      fetchVins={props.fetchVins}
                      fetchVin={props.fetchVin}
                      gererBouteille={props.gererBouteille}
                      gererBouteilles={props.gererBouteilles}
                      bouteilles={props.bouteillesTri}
                      setBouteilles={props.setBouteillesTri}
                      cellier={cellierId}
                      bouteille={bouteille}
                      URI={props.URI}
                      error={props.error}
                      setError={props.setError}
                      fetchUtilisateur={props.sfetchUtilisateur}
                      fetchAjouterFavoris={props.fetchAjouterFavoris}
                      fetchSupprimerFavoris={props.fetchSupprimerFavoris}
                      fetchStatsCelliers={props.fetchStatsCelliers}
                      fetchVinsInventaire={props.fetchVinsInventaire}
                      favorisId={props.favorisId}
                      setFavorisId={props.setFavorisId}
                    />
                  </div>
                ))}
              </div>
            )}
            {bouteilles.length === 1 && (
              <div className="Bouteille Bouteille--solo">
                <Bouteille
                  {...bouteilles[0]}
                  onBouteillePatched={props.onBouteillePatched}
                  fetchVins={props.fetchVins}
                  fetchVin={props.fetchVin}
                  celliers={props.celliers}
                  cellier={cellierId}
                  setCellier={props.setCellier}
                  emailUtilisateur={props.emailUtilisateur}
                  gererCellier={props.gererCellier}
                  gererBouteilles={props.gererBouteilles}
                  bouteille={bouteilles[0]}
                  setBouteilles={props.setBouteilles}
                  URI={props.URI}
                  fetchUtilisateur={props.fetchUtilisateur}
                  fetchAjouterFavoris={props.fetchAjouterFavoris}
                  fetchSupprimerFavoris={props.fetchSupprimerFavoris}
                  fetchStatsCelliers={props.fetchStatsCelliers}
                  fetchVinsInventaire={props.fetchVinsInventaire}
                  favorisId={props.favorisId}
                  setFavorisId={props.setFavorisId}
                />
              </div>
            )}
            {bouteilles.length === 0 && (
              <div className="ListeBouteilles--empty">
                <img
                  className="ListeBouteilles--empty__icone"
                  src={addBottleIcone}
                  alt=""
                  width={88}
                  height={88}
                />
                <h2 className="ListeBouteilles--empty__titre">
                  Ce cellier est vide
                </h2>
                <p className="ListeBouteilles--empty__texte">
                  Ajoutez votre première bouteille pour commencer à suivre votre
                  collection.
                </p>
                <NavLink to="/vins" className="ListeBouteilles--empty__cta">
                  Ajouter une bouteille
                </NavLink>
              </div>
            )}
            {bouteilles.length > 0 && bouteillesTri.length === 0 && (
              <div className="ListeBouteilles--empty ListeBouteilles--empty--filtre">
                <h2 className="ListeBouteilles--empty__titre">
                  Aucune bouteille pour ce filtre
                </h2>
                <p className="ListeBouteilles--empty__texte">
                  Essayez un autre tri, ou ajoutez une bouteille à ce cellier.
                </p>
                <div className="ListeBouteilles--empty__actions">
                  <button
                    type="button"
                    className="ListeBouteilles--empty__lien"
                    onClick={() => setSortType("tout")}
                  >
                    Afficher tout
                  </button>
                  <NavLink to="/vins" className="ListeBouteilles--empty__cta">
                    Ajouter une bouteille
                  </NavLink>
                </div>
              </div>
            )}
            {bouteilles.length > fin ? (
              <div className="fin--liste cliquable" onClick={gererVoirPlus}>
                Voir plus
              </div>
            ) : (
              bouteilles.length > 0 && (
                <div className="fin--liste">Fin de la liste</div>
              )
            )}
          </div>
          )}
        </div>
      </div>
  );
}

export default ListeBouteilles;
