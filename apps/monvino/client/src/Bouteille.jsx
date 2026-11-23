import * as React from "react";
import "./Bouteille.scss";
import { useState, useEffect, Suspense, lazy } from "react";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogTitle from "@mui/material/DialogTitle";
import MuiButton from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import favoriteIconeLine from "./img/svg/icone_favorite_blue_line.svg";
import favoriteIconeFilled from "./img/svg/icone_favorite_blue_filled.svg";
import { decodeHtmlEntities } from "./htmlEntities";
import {
  resolveBottleImage,
  isBottlePlaceholder,
  PlaceholderBouteilleSvg,
} from "./bottleImage";

const FrmBouteille = lazy(() => import("./FrmBouteille"));

const Button = styled(MuiButton)(() => ({
  color: "#152440",
  border: "1px solid #cc4240",
  textDecoration: "none",
  borderRadius: "4px",
  fontFamily: "Alata",
  fontSize: "12px",
  padding: "10px 20px",
  "&:hover": {
    backgroundColor: "#f1ab50",
    border: "1px solid #f1ab50",
    color: "#152440",
  },
}));

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function Bouteille(props) {
  const editable = Boolean(props.onBouteillePatched);
  const [eltAncrage, setEltAncrage] = useState(null);
  const menuContextuelOuvert = Boolean(eltAncrage);
  const [openAlert, setOpenAlert] = React.useState(false);
  const handleCloseAlert = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setOpenAlert(false);
  };

  /**
   *  État de la boite de dialogue de suppression
   */
  const [frmSuppressionOuvert, setFrmSuppressionOuvert] = useState(false);

  /**
   *  État de la boite de dialogue de suppression
   */
  const [messageDialog, setMessageDialog] = useState("");

  /**
   *  État d'affichage de la fiche de bouteille
   */
  const [voirFiche, setVoirFiche] = useState(false);

  /**
   *  État du formulaire de modification
   */
  const [frmOuvert, setFrmOuvert] = useState(false);

  /**
   * État de la bouteille
   */
  const [bouteille, setBouteille] = useState(props.bouteille);

  /**
   *  État de la quantité et la quantité précédente
   */
  const [quantite, setQuantite] = useState(props.quantite);

  /**
   * État de la date d'achat et la date précédente
   */
  const [dateAchat, setDateAchat] = useState("");

  /**
   * État de la date de garde et la date de garde précédente
   */
  const [dateGarde, setDateGarde] = useState("");
  const [vinNote, setVinNote] = useState("");
  const [messageRetour, setMessageRetour] = useState([]);
  const [severity, setSeverity] = useState([]);
  const [favorisIcone, setFavorisIcone] = useState([]);

  useEffect(() => {
    setFavorisIcone(
      estEnFavoris(props.favorisId, props.id)
        ? favoriteIconeFilled
        : favoriteIconeLine
    );
  }, [props.id, props.favorisId]);

  useEffect(() => {
    setQuantite(props.quantite);
  }, [props.quantite]);

  useEffect(() => {
    setBouteille(props.bouteille);
  }, [props.bouteille]);

  function estEnFavoris(array, bottleId) {
    if (!Array.isArray(array) || bottleId == null) return false;
    const target = String(bottleId);
    return array.some(
      (bouteille) => String(bouteille?.vino__bouteille_id) === target
    );
  }

  /**
   * Gestion du menu contextuel d'action d'un cellier
   * @param {*} evt
   */
  function gererMenuContextuel(evt) {
    setEltAncrage(evt.currentTarget);
    setQuantite(props.quantite);
  }

  /**
   * Gestion de la fermeture du menu contextuel d'action d'un cellier
   */
  function gererFermerMenuContextuel() {
    setEltAncrage(null);
  }

  /**
   * Gère la fermeture de la boite de dialogue de supression du profil
   */
  function viderFermerFrm() {
    gererFermerMenuContextuel();
    setFrmSuppressionOuvert(false);
    setSeverity("info");
  }

  /**
   * Gère l'ouverture de la boite de dialogue de supression du cellier
   */
  function gererSupprimer() {
    setMessageDialog("Voulez-vous vraiment supprimer cette bouteille ?");
    setFrmSuppressionOuvert(true);
  }

  /**
   * Gère la suppression du cellier
   */
  function gererSoumettre() {
    fetchSupprimerBouteille();
  }

  /**
   * Gère l'affichage du formulaire quand click du bouton "Modifier"
   */
  function gererModifier() {
    setVinNote(props.notes);
    setDateGarde(props.garde_jusqua);
    setDateAchat(props.date_achat);
    setVoirFiche(false);
    setFrmOuvert(true);
    gererFermerMenuContextuel();
  }

  /**
   * Gère l'affichage du formulaire quand click du bouton "Fiche"
   */
  function gererVoir() {
    setVinNote(props.notes);
    setDateGarde(props.garde_jusqua);
    setDateAchat(props.date_achat);
    setBouteille(props.bouteille);
    setVoirFiche(true);
    setFrmOuvert(true);
  }

  /**
   * Gère le bouton 'ajouter'
   */
  function gererAjouter() {
    gererFermerMenuContextuel();
    const current = parseInt(props.quantite, 10) || 0;
    fetchPutVinUn(
      current + 1,
      props.date_achat,
      props.garde_jusqua,
      props.notes
    );
  }

  /**
   * Gère le bouton 'Boire'
   */
  function gererBoire() {
    gererFermerMenuContextuel();
    const current = parseInt(props.quantite, 10) || 0;
    if (current > 0) {
      fetchPutVinUn(
        current - 1,
        props.date_achat,
        props.garde_jusqua,
        props.notes
      );
    } else {
      setMessageRetour(
        "Cette bouteille est en rupture de stock. Voulez-vous la supprimer?"
      );
      setSeverity("error");
      setFrmSuppressionOuvert(true);
    }
  }

  /**
   * Gère l'ajout / retrait d'une bouteille aux favoris.
   */
  function gererFavoris(e, idBouteille) {
    e.preventDefault();
    e.stopPropagation();
    if (!props.fetchAjouterFavoris || !props.fetchSupprimerFavoris) {
      return;
    }

    const dejaFavoris = estEnFavoris(props.favorisId, idBouteille);
    if (dejaFavoris) {
      setFavorisIcone(favoriteIconeLine);
      props.fetchSupprimerFavoris(idBouteille);
      return;
    }

    setFavorisIcone(favoriteIconeFilled);
    props.fetchAjouterFavoris({
      vino__utilisateur_id: props.vino__utilisateur_id,
      vino__bouteille_id: idBouteille,
    });
  }

  /**
   * Gère la modification de la quantité de bouteille
   * @param {*} NouveauQuantite
   */
  function modifierBouteille(
    NouveauQuantite,
    NouveauDateAchat,
    NouveauDateGarde,
    NouveauNote
  ) {
    var reg = /^[0-9]+$/;
    if (reg.test(String(NouveauQuantite))) {
      setQuantite(NouveauQuantite);
    }
    fetchPutVinUn(
      NouveauQuantite,
      NouveauDateAchat,
      NouveauDateGarde,
      NouveauNote
    );
  }

  /**
   * Actualiser la quantité du DB — optimistic UI, then sync.
   * @param {*} NouveauQuantite
   */
  async function fetchPutVinUn(
    NouveauQuantite,
    NouveauDateAchat,
    NouveauDateGarde,
    NouveauNote
  ) {
    const previous = {
      quantite: props.quantite,
      date_achat: props.date_achat,
      garde_jusqua: props.garde_jusqua,
      notes: props.notes,
    };
    const patched = {
      id: props.id,
      vino__cellier_id: props.vino__cellier_id,
      quantite: NouveauQuantite,
      date_achat: NouveauDateAchat,
      garde_jusqua: NouveauDateGarde,
      notes: NouveauNote,
    };

    // Paint the new count immediately (badge uses props.quantite from parent).
    setQuantite(NouveauQuantite);
    setDateAchat(NouveauDateAchat);
    setDateGarde(NouveauDateGarde);
    setVinNote(NouveauNote);
    setBouteille((prev) => ({
      ...(prev || {}),
      ...patched,
    }));
    props.onBouteillePatched?.(patched);

    const patch = {
      quantite: NouveauQuantite,
      date_achat: NouveauDateAchat,
      garde_jusqua: NouveauDateGarde,
      note: NouveauNote,
    };
    try {
      const response = await fetch(
        props.URI +
          "/" +
          "cellier" +
          "/" +
          props.vino__cellier_id +
          "/" +
          "vins" +
          "/" +
          "bouteille" +
          "/" +
          props.id,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      );
      if (!response.ok) throw response;
      await response.json().catch(() => null);
      // Background stats — do not block UI.
      props.fetchStatsCelliers?.();
    } catch (error) {
      console.error("Error fetching data: ", error);
      // Roll back optimistic update on failure.
      setQuantite(previous.quantite);
      setDateAchat(previous.date_achat);
      setDateGarde(previous.garde_jusqua);
      setVinNote(previous.notes);
      props.onBouteillePatched?.({
        id: props.id,
        vino__cellier_id: props.vino__cellier_id,
        ...previous,
      });
    }
  }

  /**
   * Supprime le cellier
   */
  async function fetchSupprimerBouteille() {
    await fetch(
      props.URI +
        `/supprimer/${props.id}/vins/cellier/${props.vino__cellier_id}`,
      {
        method: "DELETE",
      }
    )
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw response;
      })
      .then((data) => {
        setMessageRetour("Suppression effectuée");
        setSeverity("success");
        setOpenAlert(true);
        setTimeout(() => {
          props.fetchVins(props.vino__cellier_id, { force: true });
          props.fetchVinsInventaire?.({ force: true });
          props.fetchStatsCelliers?.();
          viderFermerFrm();
        }, 1000);
      })
      .catch((error) => {
        console.error("Error fetching data: ", error);
        props.setError(props.error);
      });
  }
  return (
    <>
      <div className="Bouteille" data-quantite="">
        <div className="bouteille--gestion">
          {editable && (
            <div className="quantite--container">
              <p className="quantite">
                {quantite != null && quantite !== "" ? quantite : props.quantite}
              </p>
            </div>
          )}
          {isBottlePlaceholder(props.image) ? (
            <PlaceholderBouteilleSvg
              className="bouteille--img-placeholder"
              onClick={gererVoir}
              role="img"
              aria-label="bouteille"
            />
          ) : (
            <img
              loading="lazy"
              decoding="async"
              onClick={gererVoir}
              src={resolveBottleImage(props.image, { size: "thumb" })}
              alt="bouteille"
            />
          )}
          <div data-id={props.id}>
            {editable && (
              <MoreVertIcon
                className="bouteille--gestion-dots"
                onClick={gererMenuContextuel}
              />
            )}
          </div>
        </div>
        <div className="bouteille--info-container">
          <div className="bouteille--description">
            <div className="bouteille--nom--wrapper">
              <p className="bouteille--nom">
                {decodeHtmlEntities(props.nom)}{" "}
              </p>
            </div>
            <p className="bouteille--info">
              {decodeHtmlEntities(props.type)} - {props.format} -{" "}
              {decodeHtmlEntities(props.pays)}
            </p>
            <img
              className="bouteille--btn-favoris"
              src={favorisIcone}
              alt="icone-row-left"
              width={20}
              onClick={(e) => gererFavoris(e, props.id)}
              id={props.id}
            ></img>
          </div>
        </div>
        <Snackbar
          sx={{ height: "100%" }}
          anchorOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
          open={openAlert}
          autoHideDuration={1000}
          onClose={handleCloseAlert}
        >
          <Alert
            onClose={handleCloseAlert}
            severity={severity}
            sx={[
              {
                width: "100%",
                backgroundColor: "#152440",
                border: "1px solid #f1ab50",
              },
            ]}
          >
            {messageRetour}
          </Alert>
        </Snackbar>

        {menuContextuelOuvert && (
          <Menu
            open={menuContextuelOuvert}
            anchorEl={eltAncrage}
            onClose={gererFermerMenuContextuel}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{
              style: {
                color: "#152440",
                paddingLeft: 10,
                paddingRight: 10,
                backgroundColor: "#d3d7dd",
                boxShadow: "none",
                border: "0.5px solid #152440",
              },
            }}
          >
            <MenuItem onClick={gererModifier}>Modifier</MenuItem>
            <MenuItem onClick={gererAjouter}>Ajouter</MenuItem>
            <MenuItem onClick={gererBoire}>Boire</MenuItem>
            <hr></hr>
            <MenuItem onClick={gererSupprimer}>Supprimer</MenuItem>
          </Menu>
        )}
        {frmSuppressionOuvert && (
          <Dialog
            PaperProps={{ sx: { backgroundColor: "#f3f5eb" } }}
            open={frmSuppressionOuvert}
            onClose={viderFermerFrm}
          >
            {severity === "error" ? (
              <DialogTitle>{messageRetour}</DialogTitle>
            ) : (
              <DialogTitle>
                {messageDialog ||
                  "Voulez-vous vraiment supprimer cette bouteille ?"}
              </DialogTitle>
            )}
            <DialogActions>
              <Button onClick={viderFermerFrm} className="cancel">
                Annuler
              </Button>
              <button onClick={gererSoumettre} className="action">
                Supprimer
              </button>
            </DialogActions>
          </Dialog>
        )}
        {frmOuvert && (
          <Suspense fallback={null}>
            <FrmBouteille
              bouteille={bouteille}
              frmOuvert={frmOuvert}
              setFrmOuvert={setFrmOuvert}
              voirFiche={voirFiche}
              setVoirFiche={setVoirFiche}
              bouteille_type={props.type}
              quantite={quantite}
              setQuantite={setQuantite}
              dateAchat={dateAchat}
              setDateAchat={setDateAchat}
              dateGarde={dateGarde}
              setDateGarde={setDateGarde}
              vinNote={vinNote}
              setVinNote={setVinNote}
              modifierBouteille={modifierBouteille}
              personnalise={props.personnalise}
            />
          </Suspense>
        )}
      </div>
    </>
  );
}

export default React.memo(Bouteille);
