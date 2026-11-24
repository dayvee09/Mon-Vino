import * as React from "react";
import "./BouteilleInventaire.scss";
import { styled, useTheme } from "@mui/material/styles";
import { grey } from "@mui/material/colors";
import {
  resolveBottleImage,
  isBottlePlaceholder,
  PlaceholderBouteilleSvg,
} from "./bottleImage";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";

import ListeInventaire from "./ListeInventaire";
import Chargement from "./Chargement";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { decodeHtmlEntities } from "./htmlEntities";

const drawerBleeding = 56;

/** Session cache for per-bottle stock drawers (survives remounts within the page). */
const stocksCache = new Map();
const stocksInFlight = new Map();

const Root = styled("div")(({ theme }) => ({
}));

const StyledBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "light" ? "#fff" : grey[800],
}));

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}));

const Puller = styled(Box)(({ theme }) => ({
  width: 6,
  height: 50,
  backgroundColor: theme.palette.mode === "light" ? grey[300] : grey[900],
  borderRadius: 4,
  position: "absolute",
  right: 8,
  bottom: "calc(50% - 15px)",
}));

function cacheKey(userId, bottleId) {
  return `${userId}:${bottleId}`;
}

/**
 * La tuile de l'inventaire de bouteille qui fait partie de la liste de l'inventaire de bouteille
 *
 * @date 2022-09-30
 * @param {*} props
 * @returns {*}
 */
export default function BouteilleInventaire(props) {
  const { window } = props;
  const bottleId = props.bouteilleInventaire?.id ?? props.id;
  const key = cacheKey(props.user_id, bottleId);
  const cached = stocksCache.get(key);

  const [open, setOpen] = React.useState(false);
  const [listeInventaire, setListeInventaire] = React.useState(
    () => cached || []
  );
  const [chargementInventaire, setChargementInventaire] = React.useState(false);
  const [inventaireCharge, setInventaireCharge] = React.useState(
    () => Boolean(cached)
  );

  const theme = useTheme();
  const container =
    window !== undefined ? () => window().document.body : undefined;

  const fetchListeInventaire = React.useCallback(async () => {
    if (!props.URI || !props.user_id || bottleId == null) return;
    if (stocksCache.has(key)) {
      const data = stocksCache.get(key);
      setListeInventaire(data);
      setInventaireCharge(true);
      setChargementInventaire(false);
      return data;
    }
    if (stocksInFlight.has(key)) {
      setChargementInventaire(true);
      try {
        const data = await stocksInFlight.get(key);
        setListeInventaire(data);
        setInventaireCharge(true);
        return data;
      } finally {
        setChargementInventaire(false);
      }
    }

    setChargementInventaire(true);
    const promise = fetch(
      props.URI +
        "/" +
        "user_id" +
        "/" +
        props.user_id +
        "/" +
        "vinsInventaire" +
        "/" +
        "vin_id" +
        "/" +
        bottleId
    )
      .then((response) => {
        if (response.ok) return response.json();
        throw response;
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        stocksCache.set(key, list);
        return list;
      })
      .catch((error) => {
        console.error("Error fetching data: ", error);
        props.setError?.(error);
        return [];
      })
      .finally(() => {
        stocksInFlight.delete(key);
      });

    stocksInFlight.set(key, promise);
    try {
      const list = await promise;
      setListeInventaire(list);
      setInventaireCharge(true);
      return list;
    } finally {
      setChargementInventaire(false);
    }
  }, [props.URI, props.user_id, bottleId, key, props.setError]);

  const prefetchStocks = React.useCallback(() => {
    if (stocksCache.has(key) || stocksInFlight.has(key)) return;
    fetchListeInventaire();
  }, [key, fetchListeInventaire]);

  const toggleDrawer = (newOpen) => () => {
    if (newOpen) {
      if (!inventaireCharge && !chargementInventaire) {
        fetchListeInventaire();
      }
      setOpen(true);
      return;
    }
    setOpen(false);
  };

  return (
    <>
      <div className="BouteilleInventaire" data-quantite="">
        <div className="bouteille--gestion">
          <div className="quantite--container">
            <p className="quantite">
              {" "}
              {props.bouteilleInventaire.quantite_total}{" "}
            </p>
          </div>
          {isBottlePlaceholder(props.image) ? (
            <PlaceholderBouteilleSvg
              className="bouteille--img-placeholder"
              role="img"
              aria-label="bouteille"
            />
          ) : (
            <img
              loading="eager"
              decoding="async"
              src={resolveBottleImage(props.image, { size: "thumb" })}
              alt="bouteille"
            />
          )}
        </div>
        <div className="bouteille--info-container">
          <div className="bouteille--description">
            <div className="detail--container">
              <div>
                <div className="bouteille--nom--wrapper">
                  <p className="bouteille--nom">
                    {decodeHtmlEntities(props.nom)}
                  </p>
                </div>
                <p className="bouteille--info">
                  {decodeHtmlEntities(props.type)} - {props.format} -{" "}
                  {props.millesime}
                </p>
              </div>
            </div>
            <hr></hr>
            <div className="prix--container">
              <p className="prix">
                Valeur&nbsp;totale&nbsp;:&nbsp;
                {props.bouteilleInventaire.prix_total
                  ? parseFloat(props.bouteilleInventaire.prix_total).toFixed(2)
                  : 0 || 0}
                &nbsp;$
              </p>
            </div>
            <p className="bouteille--info">
              <button
                className="action"
                type="button"
                onClick={toggleDrawer(true)}
                onMouseEnter={prefetchStocks}
                onFocus={prefetchStocks}
                onTouchStart={prefetchStocks}
              >
                Consulter les stocks
              </button>
            </p>
          </div>
        </div>
      </div>
      {open && (
        <Root>
          <SwipeableDrawer
            container={container}
            anchor="left"
            open={open}
            onClose={toggleDrawer(false)}
            onOpen={toggleDrawer(true)}
            swipeAreaWidth={drawerBleeding}
            disableSwipeToOpen={true}
            // Body scroll-lock restores inventaire scroll after navigate and
            // tucks the cellier header under the browser chrome on mobile.
            disableScrollLock
          >
            <StyledBox
              sx={{
                position: "absolute",
                top: -drawerBleeding,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                visibility: "visible",
                right: 0,
                left: 0,
              }}
            ></StyledBox>
            <Puller />
            <DrawerHeader>
              <IconButton onClick={toggleDrawer(false)}>
                {theme.direction === "ltr" ? (
                  <ChevronLeftIcon />
                ) : (
                  <ChevronRightIcon />
                )}
              </IconButton>
            </DrawerHeader>
            <Divider />
            {chargementInventaire && !inventaireCharge ? (
              <Chargement
                className="chargement--tiroir"
                message="Chargement des stocks…"
              />
            ) : (
              <>
                <Typography
                  sx={{
                    p: 4,
                    color: "text.secondary",
                    fontFamily: "raleway",
                    fontSize: "12px",
                  }}
                >
                  Cette bouteille est dans {listeInventaire.length} de vos
                  celliers{" "}
                </Typography>
                <StyledBox
                  sx={{
                    px: 2,
                    pb: 2,
                    height: "100%",
                    overflow: "auto",
                  }}
                >
                  <ListeInventaire
                    listeInventaire={listeInventaire}
                    cellier={props.cellier}
                    setOpen={setOpen}
                    fetchVins={props.fetchVins}
                    fetchNomCellier={props.fetchNomCellier}
                    gererCellier={props.gererCellier}
                    bouteilleId={bottleId}
                    gererCible={props.gererCible}
                  />
                </StyledBox>
              </>
            )}
          </SwipeableDrawer>
        </Root>
      )}
    </>
  );
}
