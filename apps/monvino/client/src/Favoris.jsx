import { useState, useEffect } from "react";
import "./Favoris.scss";
import Bouteille from "./Bouteille";
import Chargement from "./Chargement";
import { NavLink } from "react-router-dom";
import rowIcone from "./img/svg/icone_row_left_white_filled.svg";

const PAGE_SIZE = 48;

/**
 * Gestion de la bouteille à favoris
 *
 * Contenant la gestion des états, de l'ajout et la suppresion de la bouteille à favorie
 * @date 2022-09-30
 * @param {*} props
 * @returns {*}
 */
function Favoris(props) {
  const [favoris, setFavoris] = useState([]);
  const [ready, setReady] = useState(false);
  const [debut, setDebut] = useState(0);
  const [fin, setFin] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!props.URI || !props.id || !props.fetchFavorisList) {
      setReady(false);
      return;
    }

    let cancelled = false;
    if (!props.hasCachedFavoris?.()) {
      setReady(false);
    }

    async function loadFavoris() {
      try {
        const result = await props.fetchFavorisList();
        if (cancelled) return;
        if (result?.ok) {
          setFavoris(Array.isArray(result.data) ? result.data : []);
        } else {
          setFavoris([]);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching data: ", error);
        props.setError?.(error);
        setFavoris([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    loadFavoris();

    return () => {
      cancelled = true;
    };
  }, [props.URI, props.id, props.fetchFavorisList, props.hasCachedFavoris]);

  // Keep list in sync when favorisId changes (add/remove from this page or elsewhere).
  useEffect(() => {
    if (!ready || !Array.isArray(props.favorisId)) return;
    const ids = new Set(
      props.favorisId.map((f) => String(f.vino__bouteille_id))
    );
    setFavoris((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      const filtered = prev.filter((b) =>
        ids.has(String(b.vino__bouteille_id ?? b.id))
      );
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [props.favorisId, ready]);

  function gererVoirPlus() {
    if (favoris.length > fin) {
      setFin(fin + PAGE_SIZE);
    } else if (favoris.length <= fin) {
      setFin(favoris.length);
    }
  }

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
        </div>
      </div>
      <div className="Appli--container">
        <h1 className="ListeBouteille--cellier-nom">Favoris</h1>
        {!ready ? (
          <Chargement message="Chargement de vos favoris…" />
        ) : (
          <div
            className={
              favoris.length === 1
                ? "ListeBouteilles"
                : "ListeBouteilles--default"
            }
          >
            <div></div>
            {favoris.length > 1 && (
              <div className="ListeBouteille--grid">
                {favoris.slice(debut, fin).map((bouteille) => (
                  <div key={bouteille.id ?? bouteille.vino__bouteille_id}>
                    <Bouteille
                      {...bouteille}
                      fetchVins={props.fetchVins}
                      fetchVin={props.fetchVin}
                      gererBouteille={props.gererBouteille}
                      gererBouteilles={props.gererBouteilles}
                      cellier={props.cellier}
                      bouteille={bouteille}
                      URI={props.URI}
                      error={props.error}
                      setError={props.setError}
                      fetchUtilisateur={props.fetchUtilisateur}
                      fetchAjouterFavoris={props.fetchAjouterFavoris}
                      fetchSupprimerFavoris={props.fetchSupprimerFavoris}
                      id={bouteille.vino__bouteille_id}
                      vino__utilisateur_id={props.id}
                      favorisId={props.favorisId}
                      setFavorisId={props.setFavorisId}
                    />
                  </div>
                ))}
              </div>
            )}
            {favoris.length === 1 && (
              <div className="Bouteille Bouteille--solo">
                <Bouteille
                  {...favoris[0]}
                  fetchVins={props.fetchVins}
                  fetchVin={props.fetchVin}
                  celliers={props.celliers}
                  cellier={props.cellier}
                  setCellier={props.setCellier}
                  emailUtilisateur={props.emailUtilisateur}
                  gererCellier={props.gererCellier}
                  gererBouteilles={props.gererBouteilles}
                  bouteille={favoris[0]}
                  setBouteilles={props.setBouteilles}
                  URI={props.URI}
                  fetchUtilisateur={props.fetchUtilisateur}
                  fetchAjouterFavoris={props.fetchAjouterFavoris}
                  fetchSupprimerFavoris={props.fetchSupprimerFavoris}
                  id={favoris[0].vino__bouteille_id}
                  vino__utilisateur_id={props.id}
                  favorisId={props.favorisId}
                  setFavorisId={props.setFavorisId}
                />
              </div>
            )}
            {favoris.length === 0 && (
              <div>
                <h2 className="aucune-bouteille">Aucun favoris.</h2>
              </div>
            )}
            {favoris.length > fin ? (
              <div className="fin--liste cliquable" onClick={gererVoirPlus}>
                Voir plus
              </div>
            ) : (
              favoris.length > 0 && (
                <div className="fin--liste">Fin de la liste</div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Favoris;
