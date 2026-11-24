import "./FrmAjoutBouteille.scss";
import * as React from "react";
import { useState, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import BtnGroup from "./ToggleBtn";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import DateSelecteur from "./DateSelecteur";
import DateSelecteurAnnee from "./DateSelecteurAnnee";
import MuiDateProvider from "./MuiDateProvider";
import dayjs from "dayjs";
import BouteilleImageZoom from "./BouteilleImageZoom";
import Chargement from "./Chargement";
import { useNavigate } from "react-router-dom";
import Dialog from "@mui/material/Dialog";
import Alert from "@mui/material/Alert";
import { NavLink } from "react-router-dom";
import rowIcone from "./img/svg/icone_row_left_white_filled.svg";
import { resolveBottleImage, isBottlePlaceholder } from "./bottleImage";

function parseCellierId(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : "";
}

function cellierIds(celliers) {
  return (celliers || [])
    .map((cellier) => parseCellierId(cellier.id))
    .filter((id) => id !== "");
}

function resolveCellierId(cellier, celliers) {
  const ids = cellierIds(celliers);
  if (ids.length === 0) return "";
  const preferred = parseCellierId(cellier);
  if (preferred !== "" && ids.includes(preferred)) {
    return preferred;
  }
  return ids[0];
}

/**
 * Gestion de l'ajout d'une bouteille importé de la SAQ et l'ajout d'une bouteille 'non listée'
 *
 * Contenant la foncition de l'autocomplete, la gestion de la formulaire, la gestion des états
 * ainsi que la lecture et le stockage des données en utilisant 'fetch'
 * @date 2022-09-30
 * @param {*} props
 * @returns {*}
 */
export default function FrmAjoutBouteille(props) {
  /**
   * L‘état d'erreur
   */
  const [openErr, setOpenErr] = React.useState(false);
  /**
   * L‘état de message d'erreur
   */
  const [messageErr, setMessageErr] = React.useState("");
  /**
   * État de bouton, false- importer , true- créer
   */
  const [btnState, setBtnState] = useState(false);

  /**
   * État de l'erreur du formulaire
   */
  const [erreur, setErreur] = React.useState([]);
  /**
   * État de la liste de bouteille
   */
  const [vinsListe, setVinsListe] = React.useState([]);
  const [rechercheSaq, setRechercheSaq] = React.useState("");
  const [chargementSaq, setChargementSaq] = React.useState(false);
  /**
   * État de la valeur choisi du composant 'Autocomplete'
   */
  const [value, setValue] = React.useState(null);

  /**
   * État du type de bouteille
   */
  const [vinType, setVinType] = React.useState("1");
  /**
   * État du cellier choisi
   */
  const [vinCellier, setVinCellier] = React.useState(() =>
    resolveCellierId(props.cellier, props.celliers)
  );
  /**
   * État de la quantité choisie
   */
  const [vinQuantite, setVinQuantite] = React.useState(1);
  /**
   * État de la date d'achat choisie
   */
  const [vinDateAchat, setVinDateAchat] = React.useState(
    dayjs().format("YYYY-MM-DD")
  );
  /**
   * État de la date de garde choisie
   */
  const [vinGarde, setVinGarde] = React.useState(
    dayjs().add(1, "year").format("YYYY-MM-DD")
  );
  /**
   * État de la Note
   */
  const [vinNote, setVinNote] = React.useState("");
  /**
   * État du nom de la bouteille
   */
  const [vinNom, setVinNom] = React.useState(" ");
  /**
   * État du prix de la bouteille
   */
  const [vinPrix, setVinPrix] = React.useState(1);
  /**
   * État du millesime de la bouteille
   */
  const [vinMillesime, setMillesime] = React.useState("");
  /**
   * État du pays de la bouteille
   */
  const [vinPays, setVinPays] = React.useState("");
  /**
   * État du format de la bouteille
   */
  const [vinFormat, setVinFormat] = React.useState("");
  /**
   * État de la description de la bouteille
   */
  const [vinDescription, setVinDescription] = React.useState("");
  /**
   * État de l'image de la bouteille
   */
  const [vinImage, setVinImage] = React.useState("");
  /**
   * Collection des vins dans un cellier spécifié par son cellier_id
   */
  const [vinsTest, setVinsTest] = React.useState(props.bouteilles);
  /**
   * État de la navigation (sert à redirection)
   */
  const navigate = useNavigate();
  const [ajoutEnCours, setAjoutEnCours] = useState(false);

  const TYPE_LABELS = {
    1: "Vin rouge",
    2: "Vin blanc",
    3: "Vin rose",
  };

  useEffect(() => {
    if (!props.URI) return;

    const terme = rechercheSaq.trim();
    if (terme.length < 2) {
      setVinsListe([]);
      setChargementSaq(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setChargementSaq(true);
      fetch(
        `${props.URI}/cellier/1/vins?q=${encodeURIComponent(terme)}`,
        { signal: controller.signal }
      )
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw response;
        })
        .then((data) => {
          setVinsListe(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Erreur recherche catalogue SAQ:", err);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setChargementSaq(false);
          }
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [rechercheSaq, props.URI]);
  /**
   *  Fetch le cellier choisi ayant des bouteilles pour vérifier si la bouteille choisie existe déjà
   */

  useEffect(() => {
    if (!props.URI || vinCellier === "" || !Number.isFinite(vinCellier)) return;
    let cancelled = false;

    async function loadCellierVins() {
      if (props.fetchVins) {
        const result = await props.fetchVins(vinCellier, { full: true });
        if (cancelled) return;
        if (result?.ok) {
          setVinsTest(Array.isArray(result.data) ? result.data : []);
        }
        return;
      }
      try {
        const response = await fetch(
          props.URI + `/cellier/${vinCellier}/vins`
        );
        if (!response.ok) throw response;
        const data = await response.json();
        if (!cancelled) {
          setVinsTest(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching cellar bottles: ", error);
        }
      }
    }

    loadCellierVins();
    return () => {
      cancelled = true;
    };
  }, [vinCellier, props.URI, props.fetchVins]);

  useEffect(() => {
    const resolved = resolveCellierId(props.cellier, props.celliers);
    const current = parseCellierId(vinCellier);
    const ids = cellierIds(props.celliers);
    if (resolved === "") {
      if (current !== "") setVinCellier("");
      return;
    }
    if (current === "" || !ids.includes(current)) {
      setVinCellier(resolved);
    }
  }, [props.celliers, props.cellier, vinCellier]);
  /**
   * Purifier le formulaire quand on bascule entre le bouton 'importer' et 'créer'
   */
  function clearForm() {
    setValue(null);
    setRechercheSaq("");
    setVinsListe([]);
    setMillesime("");
    setVinPays("");
    setVinCellier(resolveCellierId(props.cellier, props.celliers));
    setVinFormat("");
    setVinPrix(1);
    setVinDescription("");
    setVinGarde(dayjs().add(1, "year").format("YYYY-MM-DD"));
    setVinImage("");
    setVinNom(" ");
    setVinNote("");
    setVinQuantite(1);
    setVinType("1");
    setVinDateAchat(dayjs().format("YYYY-MM-DD"));
    setErreur([]);
  }
  /**
   * Gère le bouton 'Ajouter'
   * si l'usager a bien choisi une bouteille par l'autocomplete (l'objet 'value' n'est pas vide) et le formulaire est valide
   */
  function gererAjoutBouteille() {
    if (!btnState) {
      //importer
      if (value != null) {
        let vinIndex = gereAjoutRedondance();
        if (vinIndex < 0) {
          fetchAjouterVin();
        } else {
          setOpenErr(true);
          setMessageErr(
            `La bouteille "${value ? value.nom : ""}" existe dans ce cellier !`
          );
        }
      } else {
        setOpenErr(true);
        setMessageErr(`Veuillez choisir une bouteille à ajouter !!`);
      }
    } else {
      //creer
      if (Object.keys(erreur).length === 0 && vinNom.trim() !== "") {
        fetchAjouterVin();
      } else {
        setOpenErr(true);
        setMessageErr(`Formulaire invalide!!`);
      }
    }
  }
  /**
   * Gère l'ajout d'une bouteille existé déjà dans le cellier choisi, faut faire l'option de ce cellier désactivé
   * vérifie que la bouteille à ajouter a déjà existé dans le cellier choisi, si oui on afficher une message à l'usager, Si non, on enregistra cette bouteille en DB
   * @returns  >=0, qui représent la bouteille  exist dans ce cellier, si non on pourrait l'ajouter
   */
  function gereAjoutRedondance() {
    if (vinsTest.length > 0 && value != undefined) {
      let vinsAjout = { vin_id: value.id, cellier_id: vinCellier };

      let vinsAjoutIndex = (vinsTest || []).findIndex(
        (vin) => vin.id === vinsAjout.vin_id
      );
      return vinsAjoutIndex;
    } else {
      return -1; // ajout dans un cellier vide.
    }
  }
  /**
   * Ajouter une nouvelle bouteille à la BD
   * Route API: localhost/PW2/cellier-projet/api-php/cellier/3/vins
   *
   * After POST: update local cellar cache immediately, navigate, then soft-refresh
   * in the background (no blocking force refetch).
   */
  async function fetchAjouterVin() {
    if (ajoutEnCours || !props.URI || vinCellier === "") return;
    setAjoutEnCours(true);

    const cellierId = parseInt(vinCellier, 10);
    let formData = {};
    if (btnState === false) {
      formData = {
        vino__bouteille_id: value.id,
        vino__cellier_id: cellierId,
        quantite: vinQuantite,
        date_achat: vinDateAchat,
        garde_jusqua: vinGarde,
        notes: vinNote,
        personnalise: 0,
      };
    } else {
      formData = {
        nom: vinNom,
        image: vinImage,
        code_saq: "",
        pays: vinPays,
        description: vinDescription,
        prix_saq: vinPrix,
        url_saq: "",
        url_img: "",
        format: vinFormat,
        vino__type_id: vinType,
        millesime: parseInt(vinMillesime, 10) || null,
        personnalise: 1,
        vino__cellier_id: cellierId,
        quantite: vinQuantite,
        date_achat: vinDateAchat,
        garde_jusqua: vinGarde,
        notes: vinNote,
      };
    }

    try {
      const response = await fetch(
        props.URI + "/" + "cellier" + "/" + vinCellier + "/" + "vins",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      if (!response.ok) throw response;
      const data = await response.json();

      const typeId = btnState
        ? String(vinType)
        : String(value?.vino__type_id ?? vinType);
      const bottleId = btnState
        ? data?.id ?? value?.id
        : value?.id ?? data?.id;

      const bottle = {
        vino__utilisateur_id: props.id || undefined,
        id: bottleId,
        nom: btnState ? vinNom.trim() : value?.nom,
        image: btnState ? vinImage : value?.image,
        code_saq: btnState ? "" : value?.code_saq,
        pays: btnState ? vinPays : value?.pays ?? vinPays,
        prix_saq: btnState ? vinPrix : value?.prix_saq ?? vinPrix,
        format: btnState ? vinFormat : value?.format ?? vinFormat,
        vino__type_id: typeId,
        type:
          (btnState ? null : value?.type) ||
          TYPE_LABELS[typeId] ||
          TYPE_LABELS[Number(typeId)] ||
          "",
        millesime: btnState
          ? parseInt(vinMillesime, 10) || null
          : value?.millesime ?? null,
        personnalise: btnState ? 1 : 0,
        vino__cellier_id: cellierId,
        quantite: vinQuantite,
        date_achat: vinDateAchat,
        garde_jusqua: vinGarde,
        notes: vinNote,
      };

      props.onBouteilleAjoutee?.(bottle);
      props.setCellier?.(String(cellierId));
      navigate(`/cellier/${cellierId}/vins`, { replace: true });

      // Background sync — do not block navigation or first paint.
      props.fetchVins?.(cellierId);
      props.fetchVinsInventaire?.();
      props.fetchStatsCelliers?.();
    } catch (error) {
      console.error("Error fetching data: ", error);
      props.setError?.(error);
      setOpenErr(true);
      setMessageErr("Impossible d'ajouter la bouteille. Réessayez.");
      setAjoutEnCours(false);
    }
  }
  /**
   * gérer l'affichage de l'image de bouteille, l'image par défaut va être à la place de l'image associé si elle n'existe pas
   * @returns URL de l'image
   */
  const imageSrc = resolveBottleImage(value?.image || vinImage);
  const isPlaceholderImage = isBottlePlaceholder(value?.image || vinImage);
  const imageTitre = btnState
    ? (vinNom?.trim() ? vinNom.trim() : "Bouteille personnalisée")
    : value?.nom || "Bouteille";

  return (
    <MuiDateProvider>
    <div>
      <div className="Appli--entete">
        <div className="Appli--addBottle-container">
          <BtnGroup
            className="Appli--addBottle-btnGroup"
            btnState={btnState}
            setBtnState={setBtnState}
            clearForm={clearForm}
            setMillesime={setMillesime}
            VinMillesime={vinMillesime}
          />
        </div>
      </div>
      <div className="Appli--container">
        <div className="FrmAjoutBouteille">
          <h1>AJOUTER UNE BOUTEILLE</h1>
          <div className="FrmAjoutNouvelle">
            <div
              className={`FrmAjoutBouteille__media${
                isPlaceholderImage
                  ? " FrmAjoutBouteille__media--placeholder"
                  : ""
              }`}
            >
              <BouteilleImageZoom
                imageSrc={imageSrc}
                title={imageTitre}
                alt={imageTitre}
                buttonClassName="fiche-image-btn fiche-image-btn--ajout"
                enableZoom={!isPlaceholderImage}
                isPlaceholder={isPlaceholderImage}
              />
            </div>
            {/* Apparaîte uniquement en important de la bouteille du SAQ */}
            <div className={btnState ? "hidden" : ""}>
              <label className="formInputNom" htmlFor="nom-bouteille-saq">
                Nom: {value ? value.nom : ""}
              </label>
            </div>
            {/* Autocomplete début */}
            <div className={btnState ? "hidden" : "autocomplete"}>
              <p className="instruction">
                Recherchez et importez une bouteille de la SAQ{" "}
              </p>
              <Autocomplete
                options={vinsListe}
                disablePortal
                id="nom-bouteille-saq"
                size="small"
                loading={chargementSaq}
                loadingText={
                  <Chargement
                    className="chargement--compact"
                    message="Recherche SAQ…"
                  />
                }
                filterOptions={(options) => options}
                noOptionsText={
                  rechercheSaq.trim().length < 2
                    ? "Tapez au moins 2 caractères"
                    : "La bouteille n'existe pas"
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
                inputValue={rechercheSaq}
                onInputChange={(event, newValue, reason) => {
                  setRechercheSaq(newValue);
                  if (reason === "clear" || newValue === "") {
                    setValue(null);
                    setVinsListe([]);
                  }
                }}
                // Gère du changement de l'option
                onChange={(event, newValue) => {
                  setValue(newValue);
                  // gereAjoutRedondance();
                }}
                getOptionLabel={(option) => {
                  if (!option?.nom) return "";
                  const mill =
                    option.millesime &&
                    Number(option.millesime) !== 2000
                      ? ` ${option.millesime}`
                      : "";
                  const format = option.format ? ` — ${option.format}` : "";
                  return `${option.nom}${mill}${format}`;
                }}
                renderOption={(props, option) => {
                  const { className, ...optionProps } = props;
                  const mill =
                    option.millesime && Number(option.millesime) !== 2000
                      ? String(option.millesime)
                      : null;
                  const prix =
                    option.prix_saq != null && option.prix_saq !== ""
                      ? `${Number(option.prix_saq).toFixed(2)} $`
                      : null;
                  const meta = [option.format, mill, prix].filter(Boolean);
                  return (
                    <li
                      {...optionProps}
                      key={option.id}
                      className={["saq-option", className]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="saq-option__nom">
                        {option.nom || "Sans nom"}
                      </span>
                      {meta.length > 0 && (
                        <span className="saq-option__meta">
                          {meta.map((part, i) => (
                            <React.Fragment key={`${option.id}-m-${i}`}>
                              {i > 0 && (
                                <span className="saq-option__sep" aria-hidden>
                                  ·
                                </span>
                              )}
                              <span>{part}</span>
                            </React.Fragment>
                          ))}
                        </span>
                      )}
                    </li>
                  );
                }}
                renderInput={(params) => <TextField {...params} size="small" />}
              />
            </div>
            {/* Autocomplete fin */}

            <Grid container spacing={1}>
              {/* min-width -- (desktop)lg:1200px - md:992px - sm:768px, xs(mobile)-max-width:768px */}
              <Grid
                size={{ xs: 12, sm: 12, md: 12, lg: 12 }}
                className={btnState ? "" : "hidden"}
              >
                <label className="formInputNom creer" htmlFor="nom-bouteille-perso">
                  Nom
                </label>
                <p className="instruction">Créer une bouteille personnalisée</p>
                <TextField
                  fullWidth
                  size="small"
                  id="nom-bouteille-perso"
                  type="text"
                  name="nom"
                  value={vinNom}
                  onChange={(e) => {
                    setVinNom(e.target.value);
                    e.target.value === ""
                      ? setErreur({ nom: "champ obligatoire" })
                      : delete erreur["nom"];
                  }}
                  error={vinNom === ""}
                  helperText={vinNom === "" ? "* Champ obligatoire!" : ""}
                />
              </Grid>
              <Grid
                size={{ xs: 6, sm: 6, md: 3, lg: 3 }}
                className={btnState ? "" : "hidden"}
              >
                <label htmlFor="millesime">Millesime</label>
                <TextField
                  fullWidth
                  size="small"
                  type="text"
                  name="millesime"
                  id="millesime"
                  disabled={btnState ? false : true}
                  className={!btnState ? "nonSelect" : ""}
                  value={value?.millesime ?? vinMillesime}
                  onChange={(e) => {
                    setMillesime(e.target.value);
                  }}
                />
              </Grid>
              <Grid size={{ xs: btnState ? 6 : 12, sm: btnState ? 6 : 12, md: btnState ? 3 : 6, lg: btnState ? 3 : 6 }}>
                <label htmlFor="pays">Pays</label>
                <TextField
                  fullWidth
                  size="small"
                  type="text"
                  name="pays"
                  id="pays"
                  disabled={btnState ? false : true}
                  className={!btnState ? "nonSelect" : ""}
                  value={value?.pays ?? vinPays}
                  onChange={(e) => {
                    setVinPays(e.target.value);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 6, md: 3, lg: 3 }}>
                <label htmlFor="prix">Prix</label>
                <TextField
                  fullWidth
                  size="small"
                  id="prix"
                  type="number"
                  name="prix"
                  disabled={btnState ? false : true}
                  className={!btnState ? "nonSelect" : ""}
                  value={value?.prix_saq ?? vinPrix}
                  onChange={(e) => {
                    setVinPrix(e.target.value);
                    e.target.value === ""
                      ? setErreur({ prix: "champ obligatoire" })
                      : delete erreur["prix"];
                  }}
                />
                <p className={erreur["prix"] ? "active" : "hidden"}>
                  ✳ {erreur["prix"]}{" "}
                </p>
              </Grid>
              <Grid size={{ xs: 6, sm: 6, md: 3, lg: 3 }}>
                <label htmlFor="format">format(ml)</label>
                <TextField
                  fullWidth
                  size="small"
                  id="format"
                  type="text"
                  name="format"
                  disabled={btnState ? false : true}
                  className={!btnState ? "nonSelect" : ""}
                  value={value?.format ?? vinFormat}
                  onChange={(e) => {
                    setVinFormat(e.target.value);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 12, md: 12 }}>
                <label htmlFor="description">Description</label>
                <TextField
                  fullWidth
                  size="small"
                  type="text"
                  name="description"
                  multiline
                  rows={2}
                  id="description"
                  // maxRows={3}
                  disabled={btnState ? false : true}
                  className={!btnState ? "nonSelect" : ""}
                  value={value?.description ?? vinDescription}
                  onChange={(e) => {
                    setVinDescription(e.target.value);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 12, md: 4, lg: 4 }}>
                <label htmlFor="type">Type</label>
                <TextField
                  select
                  value={String(value?.vino__type_id ?? vinType)}
                  onChange={(e) => {
                    setVinType(e.target.value);
                  }}
                  slotProps={{
                    select: { native: true },
                  }}
                  fullWidth
                  size="small"
                  name="type"
                  id="type"
                  className={!btnState ? "nonSelect" : ""}
                  disabled={btnState ? false : true}
                >
                  {types.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 6, sm: 6, md: 4, lg: 4 }}>
                <label>Date d'achat</label>
                <DateSelecteur
                  dateAchat={vinDateAchat}
                  setDateAchat={setVinDateAchat}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 6, md: 4, lg: 4 }}>
                <label>Garde</label>
                <DateSelecteurAnnee
                  dateGarde={vinGarde}
                  setDateGarde={setVinGarde}
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 6, md: 6, lg: 6 }}>
                <label htmlFor="quantite">Quantite</label>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  id="quantite"
                  slotProps={{
                    htmlInput: {
                      min: 1,
                      inputMode: "numeric",
                      pattern: "[1-9][0-9]*",
                    },
                  }}
                  name="quantite"
                  required
                  value={vinQuantite}
                  onChange={(e) => {
                    setVinQuantite(e.target.value);
                    e.target.value === ""
                      ? setErreur({ quantite: "champ obligatoire" })
                      : delete erreur["quantite"];
                  }}
                />
                <p className={erreur["quantite"] ? "active" : "hidden"}>
                  ✳ {erreur["quantite"]}{" "}
                </p>
              </Grid>

              <Grid size={{ xs: 6, sm: 6, md: 6, lg: 6 }}>
                <label htmlFor="cellier-bouteille">Cellier</label>
                <TextField
                  select
                  id="cellier-bouteille"
                  value={
                    cellierIds(props.celliers).includes(
                      parseCellierId(vinCellier)
                    )
                      ? parseCellierId(vinCellier)
                      : ""
                  }
                  onChange={(e) => {
                    setVinCellier(parseCellierId(e.target.value));
                  }}
                  slotProps={{
                    select: { native: true },
                  }}
                  fullWidth
                  size="small"
                  name="cellier"
                >
                  {props.celliers.map((cellier) => (
                    <option key={cellier.id} value={parseCellierId(cellier.id)}>
                      {cellier.nom}
                    </option>
                  ))}
                </TextField>
                <p className={erreur["ajout"] ? "active" : "hidden"}>
                  ✳ {erreur["ajout"]}{" "}
                </p>
              </Grid>

              <Grid size={{ xs: 12, sm: 12 }}>
                <label htmlFor="note">Note</label>
                <TextField
                  fullWidth
                  size="small"
                  type="text"
                  name="notes"
                  id="note"
                  value={vinNote}
                  onChange={(e) => {
                    setVinNote(e.target.value);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    mt: 2,
                    mb: 2,
                  }}
                >
                  <button
                    className="btn--ajouter"
                    type="button"
                    disabled={ajoutEnCours}
                    onClick={gererAjoutBouteille}
                  >
                    {ajoutEnCours ? "Ajout…" : "Ajouter"}
                  </button>
                </Box>
              </Grid>
              <Dialog open={openErr}>
                <Alert
                  severity="error"
                  action={
                    <IconButton
                      aria-label="close"
                      size="small"
                      onClick={() => {
                        setOpenErr(false);
                      }}
                    >
                      <CloseIcon fontSize="inherit" />
                    </IconButton>
                  }
                >
                  {messageErr}
                </Alert>
              </Dialog>
            </Grid>
          </div>
        </div>
      </div>
    </div>
    </MuiDateProvider>
  );
}
const types = [
  {
    value: "1",
    label: "Vin rouge",
  },
  {
    value: "2",
    label: "Vin blanc",
  },
  {
    value: "3",
    label: "Vin rosé",
  },
];
