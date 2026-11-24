// Début des modifications

import React, { Suspense, lazy } from "react";
import { Route, Routes, Navigate, useLocation, Link } from "react-router-dom";
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Hub } from "aws-amplify/utils";
import {
  Authenticator,
  useAuthenticator,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "./Appli.scss";
import NavMobile from "./NavMobile";
import NavDesktop from "./NavDesktop";
import PiedDePage from "./PiedDePage.jsx";
import ListeCelliers from "./ListeCelliers";
import Utilisateur from "./Utilisateur.jsx";
import {
  signOut,
  deleteUser,
  emailFromCognitoUser,
  isUsableAccountEmail,
  looksLikeFederatedUsername,
} from "./auth";
import {
  readLocalSession,
  clearLocalSession,
} from "./localAuth";
import LocalAdminLogin from "./LocalAdminLogin";
import SiteHomeLink from "./SiteHomeLink";
import { email } from "./utilisateur.js";
import Logo from "./img/png/logo-jaune.png";
import { formFields } from "./aws-form-traduction.js";
import Chargement from "./Chargement";
// Hot path + frequent nav targets stay eager (no lazy-chunk wait on click).
import ListeBouteilles from "./ListeBouteilles";
import ListeBouteillesInventaire from "./ListeBouteillesInventaire";
import Profil from "./Profil.jsx";
import Aide from "./Aide";

const FrmAjoutBouteille = lazy(() => import("./FrmAjoutBouteille"));
const Favoris = lazy(() => import("./Favoris"));
const FrmAjoutCellier = lazy(() => import("./FrmAjoutCellier"));
const FrmModifierCellier = lazy(() => import("./FrmModifierCellier"));
const Admin = lazy(() => import("./Admin"));

/** First-page size for cellar bottles (matches ListeBouteilles PAGE_SIZE). */
const VINS_FIRST_PAGE = 48;

function prefetchRouteChunk(importer) {
  return () => {
    importer();
  };
}

const prefetchAjoutBouteilleChunk = prefetchRouteChunk(() =>
  import("./FrmAjoutBouteille")
);
const prefetchFavorisChunk = prefetchRouteChunk(() => import("./Favoris"));
const prefetchAdminChunk = prefetchRouteChunk(() => import("./Admin"));

const RouteFallback = () => <Chargement message="Chargement…" />;

function ProfilRedirect({ emailUtilisateur }) {
  if (!emailUtilisateur) {
    return <Navigate to="/" replace />;
  }
  return (
    <Navigate
      to={`/profil/${encodeURIComponent(emailUtilisateur)}`}
      replace
    />
  );
}

/**
 * Gestion de l'application
 *
 * contenant la gestion des états, la configuration de la varible de l'environnement , des paramètres de routage du système.
 * Prétraitement, acquisition et chargement de toutes les données à render, déploiement logique algorithmique.
 * Disposition des composants
 *
 * @date 2022-09-30
 * @returns {*}
 */
// In Docker/dev, same-origin nested path; setupProxy.js forwards to Apache :80.
const DEV_API_URI = process.env.REACT_APP_API_URI || "/api-php";
// Prefer REACT_APP_API_URI in .env.production; same-origin default for nested deploys.
const PROD_API_URI = "/api-php/index.php";

function normalizeUtilisateur(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data.length > 0 && data[0]?.id ? data[0] : null;
  }
  if (data.erreur) return null;
  return data.id ? data : null;
}

const AppliContent = ({
  cognitoUser = null,
  localSession = null,
  onClearLocalSession = null,
  onLocalSessionUpdate = null,
}) => {
  const { authStatus, route } = useAuthenticator();
  const cognitoAuthenticated =
    route === "authenticated" ||
    route === "signOut" ||
    authStatus === "authenticated";
  const isLocalAuth = Boolean(localSession?.token);
  const isAuthenticated = isLocalAuth || cognitoAuthenticated;

  const [error, setError] = useState(null);
  const [bouteilles, setBouteilles] = useState([]);
  const [bouteillesInventaire, setBouteillesInventaire] = useState([]);
  const [emailUtilisateur, setEmailUtilisateur] = useState(
    localSession?.utilisateur?.email || ""
  );
  const [id, setId] = useState(
    localSession?.utilisateur?.id != null
      ? String(localSession.utilisateur.id)
      : ""
  );
  const [cellier, setCellier] = useState("");
  const [cible, setCible] = useState("");
  const [nomCellier, setNomCellier] = useState(null);
  const [username, setUsername] = useState(
    localSession?.utilisateur?.nom || ""
  );
  const [utilisateur, setUtilisateur] = useState(
    localSession?.utilisateur || null
  );
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [celliers, setCelliers] = useState([]);
  const [celliersReady, setCelliersReady] = useState(false);
  const [indexNav, setIndexNav] = useState(0);
  const [resetBottomNav, setResetBottomNav] = useState(false);
  const URI =
    process.env.REACT_APP_API_URI ||
    (process.env.NODE_ENV === "production" ? PROD_API_URI : DEV_API_URI);
  const [favorisId, setFavorisId] = useState([]);
  const [statsCelliers, setStatsCelliers] = useState({});
  const [userLoadError, setUserLoadError] = useState(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  const bootstrapRunning = useRef(false);
  const bouteillesCacheRef = useRef({});
  const vinsFetchInFlightRef = useRef({});
  const inventaireCacheRef = useRef(null);
  const inventaireFetchInFlightRef = useRef(null);
  const favorisLoadedRef = useRef(false);
  const favorisFetchInFlightRef = useRef(null);
  const favorisListCacheRef = useRef(null);
  const favorisListFetchInFlightRef = useRef(null);
  const cellierActifRef = useRef("");

  const location = useLocation();
  const appliScrollRef = useRef(null);

  useEffect(() => {
    const match = location.pathname.match(/\/cellier\/(\d+)\/vins/);
    if (match) {
      cellierActifRef.current = match[1];
      setCellier(match[1]);
    }
  }, [location.pathname]);

  // .Appli is the mobile scrollport. Inventaire → stocks drawer → cellier
  // used to keep the old scrollTop, tucking the header under the URL bar.
  // useLayoutEffect runs before paint; follow-up ticks beat MUI scroll unlock.
  useLayoutEffect(() => {
    const resetScroll = () => {
      const node = appliScrollRef.current;
      if (node) node.scrollTop = 0;
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetScroll();
    const raf = requestAnimationFrame(resetScroll);
    const t0 = window.setTimeout(resetScroll, 0);
    const t1 = window.setTimeout(resetScroll, 50);
    const t2 = window.setTimeout(resetScroll, 200);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [location.pathname]);

  function applyUtilisateur(user, userEmail) {
    setUtilisateur(user);
    setId(String(user.id));
    setUsername(user.nom || defaultUsernameFromEmail(userEmail));
    setEmailUtilisateur(userEmail);
  }

  function applyStatsRows(rows) {
    const map = {};
    if (Array.isArray(rows)) {
      rows.forEach((row) => {
        map[String(row.cellier_id)] = row;
      });
    }
    setStatsCelliers(map);
  }

  function applyMePayload(payload, userEmail) {
    const user = payload?.utilisateur;
    if (!user?.id) return false;
    applyUtilisateur(user, userEmail || user.email);
    setCelliers(Array.isArray(payload.celliers) ? payload.celliers : []);
    setCelliersReady(true);
    applyStatsRows(payload.stats);
    if (Array.isArray(payload.favorisId)) {
      setFavorisId(payload.favorisId);
      favorisLoadedRef.current = true;
    }
    return true;
  }

  // ------------------------------- fonctions de gestion des états ----------------------------

  useEffect(() => {
    if (!isAuthenticated) {
      setId("");
      setUtilisateur(null);
      setEmailUtilisateur("");
      setUsername("");
      setCelliers([]);
      setCelliersReady(false);
      setUserLoadError(null);
      bootstrapRunning.current = false;
      return;
    }

    if (isLocalAuth && localSession?.utilisateur) {
      applyUtilisateur(
        localSession.utilisateur,
        localSession.utilisateur.email
      );
      setUserLoadError(null);
      return;
    }

    let cancelled = false;

    async function resolveEmail() {
      setUserLoadError(null);
      // Prefer a real email from Authenticator — never a google_/facebook_ subject.
      const localEmail = emailFromCognitoUser(cognitoUser);
      if (isUsableAccountEmail(localEmail)) {
        setEmailUtilisateur((prev) =>
          isUsableAccountEmail(prev) ? prev : localEmail
        );
      }

      try {
        const resolved = await email(cognitoUser);
        if (cancelled) return;
        if (isUsableAccountEmail(resolved)) {
          setEmailUtilisateur((prev) =>
            prev === resolved ? prev : resolved
          );
          return;
        }
      } catch (err) {
        console.warn("Optional email upgrade skipped:", err);
      }

      if (!cancelled && !isUsableAccountEmail(localEmail)) {
        setUserLoadError(
          new Error(
            "Impossible de lire l'email du compte connecté. Réessayez ou utilisez la connexion par courriel."
          )
        );
      }
    }

    resolveEmail();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, cognitoUser, isLocalAuth, localSession]);

  // If Cognito later resolves a real email, drop any shadow google_* account id.
  useEffect(() => {
    if (!isAuthenticated || isLocalAuth) return;
    if (!isUsableAccountEmail(emailUtilisateur)) return;
    if (
      utilisateur?.email &&
      looksLikeFederatedUsername(utilisateur.email) &&
      utilisateur.email !== emailUtilisateur
    ) {
      setId("");
      setUtilisateur(null);
      setCelliers([]);
      setCelliersReady(false);
      bouteillesCacheRef.current = {};
    }
  }, [isAuthenticated, isLocalAuth, emailUtilisateur, utilisateur?.email]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!URI || !emailUtilisateur) return;
    // Do not bootstrap with Cognito subject IDs — that creates empty shadow accounts.
    if (!isUsableAccountEmail(emailUtilisateur)) return;
    if (id) return;

    let cancelled = false;

    async function bootstrap() {
      if (bootstrapRunning.current) return;
      bootstrapRunning.current = true;
      try {
        setUserLoadError(null);
        const ok = await ensureUser(emailUtilisateur);
        if (!cancelled && !ok) {
          setUserLoadError(
            (prev) =>
              prev ||
              new Error(
                "Compte introuvable dans la base de données. Vérifiez que l'API PHP répond."
              )
          );
        }
      } catch (err) {
        console.error("Session bootstrap failed:", err);
        if (!cancelled) {
          setUserLoadError(err);
        }
      } finally {
        bootstrapRunning.current = false;
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
      bootstrapRunning.current = false;
    };
  }, [isAuthenticated, URI, emailUtilisateur, id, sessionVersion]);

  useEffect(() => {
    const cancel = Hub.listen("auth", ({ payload }) => {
      // Do not react to tokenRefresh — that re-triggers Cognito calls and
      // quickly hits TooManyRequestsException after Identity Pool 400s.
      if (payload.event === "signedIn") {
        bootstrapRunning.current = false;
        setEmailUtilisateur("");
        setId("");
        setSessionVersion((version) => version + 1);
      }
    });
    return () => cancel();
  }, []);

  useEffect(() => {
    if (!URI || !id) {
      setCelliersReady(false);
      return;
    }
    // /me bootstrap (ensureUser) may already have filled celliers + stats.
    if (celliersReady) return;

    let cancelled = false;

    async function loadSessionShell() {
      if (emailUtilisateur && isUsableAccountEmail(emailUtilisateur)) {
        try {
          const response = await fetch(
            URI +
              "/email/" +
              encodeURIComponent(emailUtilisateur) +
              "/me",
            { signal: AbortSignal.timeout(15000) }
          );
          if (response.ok) {
            const payload = await response.json();
            if (!cancelled && payload?.utilisateur?.id) {
              applyMePayload(payload, emailUtilisateur);
              return;
            }
          }
        } catch (error) {
          console.error("Bootstrap /me failed, falling back:", error);
        }
      }
      if (!cancelled) {
        fetchCelliers();
      }
    }

    loadSessionShell();

    return () => {
      cancelled = true;
    };
  }, [URI, id, emailUtilisateur, celliersReady]);

  useEffect(() => {
    if (!URI || !id) return;
    const needsFavoris =
      /^\/cellier\/\d+\/vins/.test(location.pathname) ||
      location.pathname === "/favoris";
    const needsInventaire = location.pathname === "/vinsInventaire";
    if (needsFavoris) {
      ensureFavorisLoaded();
    }
    if (needsInventaire) {
      fetchVinsInventaire();
    }
  }, [URI, id, location.pathname]);

  // -------------------------- Requêtes Fetch ------------------------------------------------------

  // ----------------------- Gestion des utilisateurs ------------------------------------------------
  function defaultUsernameFromEmail(emailUtilisateur) {
    if (emailUtilisateur.includes("@")) {
      return emailUtilisateur.substring(0, emailUtilisateur.indexOf("@"));
    }
    if (emailUtilisateur.includes("amazon")) return "Utilisateur Amazon";
    if (emailUtilisateur.includes("google")) return "Utilisateur Google";
    if (emailUtilisateur.includes("facebook")) return "Utilisateur facebook";
    return "Utilisateur";
  }

  async function ensureUser(userEmail) {
    if (!URI || !userEmail) return false;
    if (!isUsableAccountEmail(userEmail)) return false;

    const encodedEmail = encodeURIComponent(userEmail);
    const fetchApi = (path, options = {}) =>
      fetch(URI + path, { ...options, signal: AbortSignal.timeout(15000) });

    try {
      setUserLoadError(null);
      const existingMe = await fetchApi("/email/" + encodedEmail + "/me");
      if (existingMe.ok) {
        const payload = await existingMe.json();
        if (payload?.utilisateur?.id) {
          applyMePayload(payload, userEmail);
          return true;
        }
      }

      const reponse = await fetchApi("/admin/ajout/utilisateurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          nom: defaultUsernameFromEmail(userEmail),
        }),
      });
      if (!reponse.ok) {
        let detail = "";
        try {
          const errBody = await reponse.json();
          detail = errBody?.erreur ? `: ${errBody.erreur}` : "";
        } catch {
          /* ignore */
        }
        throw new Error(
          `Création du compte refusée (HTTP ${reponse.status})${detail}`
        );
      }

      const created = await reponse.json().catch(() => null);

      const meRetry = await fetchApi("/email/" + encodedEmail + "/me");
      if (meRetry.ok) {
        const payload = await meRetry.json();
        if (payload?.utilisateur?.id) {
          applyMePayload(payload, userEmail);
          return true;
        }
      }

      if (created?.id) {
        applyUtilisateur(
          {
            id: created.id,
            email: userEmail,
            nom: defaultUsernameFromEmail(userEmail),
          },
          userEmail
        );
        return true;
      }

      setUserLoadError(new Error("Utilisateur introuvable"));
      return false;
    } catch (error) {
      console.error("Error creating user: ", error);
      const timedOut =
        error?.name === "TimeoutError" || error?.name === "AbortError";
      setUserLoadError(
        timedOut
          ? new Error(
              "L'API PHP ne répond pas (délai dépassé). Vérifiez qu'Apache tourne: sudo service apache2 start"
            )
          : error
      );
      setError(error);
      return false;
    }
  }

  // Alias kept for any legacy references (e.g. props named createUser)
  const createUser = ensureUser;

  async function fetchUtilisateurs() {
    if (!URI || !emailUtilisateur) return;
    await fetch(
      URI + "/" + "admin" + "/" + emailUtilisateur + "/" + "utilisateurs"
    )
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw response;
      })
      .then((data) => {
        setUtilisateurs(data);
      })
      .catch((error) => {
        console.error("Error fetching data: ", error);
        setError(error);
      });
  }

  async function fetchUtilisateur() {
    if (!URI || !emailUtilisateur) return;
    const encodedEmail = encodeURIComponent(emailUtilisateur);
    await fetch(URI + "/email/" + encodedEmail + "/utilisateurs")
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw response;
      })
      .then((data) => {
        const user = normalizeUtilisateur(data);
        if (user) {
          applyUtilisateur(user, emailUtilisateur);
        }
      })
      .catch((error) => {
        console.error("Error fetching utilisateur: ", error);
        setError(error);
      });
  }

  async function supprimerUtilisateur() {
    let reponse = await fetch(
      URI + "/" + "email" + "/" + emailUtilisateur + "/" + "utilisateurs",
      { method: "DELETE" }
    );
    let reponseJson = await reponse.json();
    await deleteUser()
      .then(() => {
        setId("");
        setUtilisateur(null);
        setBouteilles("");
        setBouteillesInventaire([]);
        inventaireCacheRef.current = null;
        favorisLoadedRef.current = false;
        setFavorisId([]);
        setCelliers([]);
        setCelliersReady(false);
        setEmailUtilisateur("");
        setUsername("");
        bootstrapRunning.current = false;
      })
      .catch((err) =>
        console.log("Erreur lors de la suppression de votre profil", err)
      );
  }

  function resetClientSession() {
    setResetBottomNav(false);
    setId("");
    setUtilisateur(null);
    setBouteilles("");
    setBouteillesInventaire([]);
    inventaireCacheRef.current = null;
    favorisLoadedRef.current = false;
    favorisListCacheRef.current = null;
    setFavorisId([]);
    setCelliers([]);
    setCelliersReady(false);
    setEmailUtilisateur("");
    setUsername("");
    setIndexNav(0);
    bootstrapRunning.current = false;
  }

  async function gererSignOut() {
    if (isLocalAuth) {
      clearLocalSession();
      resetClientSession();
      onClearLocalSession?.();
      return;
    }
    try {
      await signOut();
      resetClientSession();
    } catch (err) {
      console.log("Erreur lors de la déconnexion", err);
    }
  }

  // ---------------------------------- Gestion des celliers -----------------------------
  const fetchStatsCelliers = useCallback(async () => {
    if (!URI || !id) return;
    try {
      const response = await fetch(
        URI + "/" + "user_id" + "/" + id + "/" + "stats"
      );
      if (!response.ok) throw response;
      const data = await response.json();
      applyStatsRows(data);
    } catch (error) {
      console.error("Error fetching cellar stats: ", error);
    }
  }, [URI, id]);

  const fetchCelliers = useCallback(async () => {
    if (!URI || !id) return;
    await fetch(URI + "/" + "user_id" + "/" + id + "/" + "celliers")
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw response;
      })
      .then((data) => {
        if (data?.erreur === undefined) {
          setCelliers(Array.isArray(data) ? data : []);
          fetchStatsCelliers();
        } else {
          setCelliers([]);
        }
      })
      .catch((error) => {
        console.error("Error fetching data: ", error);
        setError(error);
        setCelliers([]);
      })
      .finally(() => {
        setCelliersReady(true);
      });
  }, [URI, id, fetchStatsCelliers]);

  const fetchNomCellier = useCallback(
    async (cellierId) => {
      const targetCellier = cellierId ?? cellier;
      if (!URI || !id || !targetCellier) return;
      await fetch(
        URI +
          "/" +
          "user_id" +
          "/" +
          id +
          "/" +
          "celliers" +
          "/" +
          "cellier" +
          "/" +
          targetCellier
      )
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw response;
        })
        .then((data) => {
          if (data && data.nom) {
            setNomCellier(data);
          }
        })
        .catch((error) => {
          console.error("Error fetching data: ", error);
          setError(error);
        });
    },
    [URI, id, cellier]
  );

  // --------------------------------- Gestion des bouteilles ------------------------------------

  const loadVinsFromApi = useCallback(
    async (cellierId, options = {}) => {
      const { limit = null, offset = 0 } = options;
      const key =
        limit != null
          ? `${cellierId}:p:${offset}:${limit}`
          : String(cellierId);
      if (vinsFetchInFlightRef.current[key]) {
        return vinsFetchInFlightRef.current[key];
      }
      const promise = (async () => {
        try {
          let url =
            URI + "/" + "cellier" + "/" + cellierId + "/" + "vins";
          if (limit != null) {
            url +=
              `?limit=${encodeURIComponent(limit)}` +
              `&offset=${encodeURIComponent(offset)}`;
          }
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const data = await response.json();
          if (data?.erreur) {
            throw new Error(data.erreur);
          }
          if (data && Array.isArray(data.items)) {
            return {
              ok: true,
              data: data.items,
              total: Number(data.total) || data.items.length,
              paginated: true,
            };
          }
          const list = Array.isArray(data) ? data : [];
          return {
            ok: true,
            data: list,
            total: list.length,
            paginated: false,
          };
        } catch (error) {
          console.error("Error fetching data: ", error);
          setError(error);
          return { ok: false, error };
        } finally {
          delete vinsFetchInFlightRef.current[key];
        }
      })();
      vinsFetchInFlightRef.current[key] = promise;
      return promise;
    },
    [URI]
  );

  const invalidateBouteillesCache = useCallback((cellierId) => {
    if (cellierId != null) {
      delete bouteillesCacheRef.current[String(cellierId)];
    } else {
      bouteillesCacheRef.current = {};
    }
  }, []);

  const fetchVins = useCallback(
    async (cellierId, options = {}) => {
      const { force = false, full = false } = options;
      const key = String(cellierId);
      if (!URI || !cellierId) return { ok: false };

      const cached = bouteillesCacheRef.current[key];
      if (cached && !force) {
        setBouteilles(cached);
        loadVinsFromApi(cellierId).then((result) => {
          if (result.ok) {
            bouteillesCacheRef.current[key] = result.data;
            if (cellierActifRef.current === key) {
              setBouteilles(result.data);
            }
          }
        });
        return { ok: true, data: cached, fromCache: true };
      }

      // Forms that need every bottle (duplicate checks) skip progressive paging.
      if (full || force) {
        const result = await loadVinsFromApi(cellierId);
        if (result.ok) {
          bouteillesCacheRef.current[key] = result.data;
          setBouteilles(result.data);
        } else {
          invalidateBouteillesCache(cellierId);
          setBouteilles([]);
        }
        return result;
      }

      // Fast first paint: first page, then fill the rest in the background.
      const first = await loadVinsFromApi(cellierId, {
        limit: VINS_FIRST_PAGE,
        offset: 0,
      });
      if (!first.ok) {
        invalidateBouteillesCache(cellierId);
        setBouteilles([]);
        return first;
      }

      bouteillesCacheRef.current[key] = first.data;
      setBouteilles(first.data);

      if (first.paginated && first.total > first.data.length) {
        loadVinsFromApi(cellierId).then((result) => {
          if (result.ok) {
            bouteillesCacheRef.current[key] = result.data;
            if (cellierActifRef.current === key) {
              setBouteilles(result.data);
            }
          }
        });
      }

      return first;
    },
    [URI, loadVinsFromApi, invalidateBouteillesCache]
  );

  const prefetchVins = useCallback(
    (cellierId) => {
      const key = String(cellierId);
      if (!URI || !cellierId || bouteillesCacheRef.current[key]) return;
      if (vinsFetchInFlightRef.current[key]) return;
      if (vinsFetchInFlightRef.current[`${cellierId}:p:0:${VINS_FIRST_PAGE}`]) {
        return;
      }
      loadVinsFromApi(cellierId, {
        limit: VINS_FIRST_PAGE,
        offset: 0,
      }).then((result) => {
        if (result.ok) {
          bouteillesCacheRef.current[key] = result.data;
          if (result.paginated && result.total > result.data.length) {
            loadVinsFromApi(cellierId).then((full) => {
              if (full.ok) {
                bouteillesCacheRef.current[key] = full.data;
              }
            });
          }
        }
      });
    },
    [URI, loadVinsFromApi]
  );

  const onBouteillePatched = useCallback((updated) => {
    if (!updated?.id) return;
    const bottleId = String(updated.id);
    const cellierKey =
      updated.vino__cellier_id != null
        ? String(updated.vino__cellier_id)
        : null;
    const patchFields = {
      quantite: updated.quantite,
      date_achat: updated.date_achat,
      garde_jusqua: updated.garde_jusqua,
      notes: updated.notes,
    };

    const patchList = (list) => {
      if (!Array.isArray(list)) return list;
      return list.map((b) =>
        String(b.id) === bottleId ||
        String(b.vino__bouteille_id) === bottleId
          ? { ...b, ...patchFields }
          : b
      );
    };

    setBouteilles((prev) => patchList(prev));
    if (cellierKey && bouteillesCacheRef.current[cellierKey]) {
      bouteillesCacheRef.current[cellierKey] = patchList(
        bouteillesCacheRef.current[cellierKey]
      );
    }
    setBouteillesInventaire((prev) => patchList(prev));
    if (inventaireCacheRef.current) {
      inventaireCacheRef.current = patchList(inventaireCacheRef.current);
    }
    if (favorisListCacheRef.current) {
      favorisListCacheRef.current = patchList(favorisListCacheRef.current);
    }
  }, []);

  const onBouteilleAjoutee = useCallback((bottle) => {
    if (!bottle?.id || bottle.vino__cellier_id == null) return;
    const key = String(bottle.vino__cellier_id);
    const bottleId = String(bottle.id);

    const merge = (list) => {
      const arr = Array.isArray(list) ? list : [];
      const idx = arr.findIndex((b) => String(b.id) === bottleId);
      if (idx >= 0) {
        const next = arr.slice();
        next[idx] = { ...arr[idx], ...bottle };
        return next;
      }
      return [...arr, bottle];
    };

    cellierActifRef.current = key;
    setBouteilles((prev) => merge(prev));
    bouteillesCacheRef.current[key] = merge(
      bouteillesCacheRef.current[key] || []
    );
    inventaireCacheRef.current = null;
  }, []);

  // --------------------------------- Gestion des différentes bouteilles comprises dans tous mes celliers ------------------------------------

  const loadInventaireFromApi = useCallback(async () => {
    if (inventaireFetchInFlightRef.current) {
      return inventaireFetchInFlightRef.current;
    }
    const promise = (async () => {
      try {
        const response = await fetch(
          URI + "/" + "user_id" + "/" + id + "/" + "vinsInventaire"
        );
        if (!response.ok) throw response;
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        return { ok: true, data: list };
      } catch (error) {
        console.error("Error fetching data: ", error);
        setError(error);
        return { ok: false, error };
      } finally {
        inventaireFetchInFlightRef.current = null;
      }
    })();
    inventaireFetchInFlightRef.current = promise;
    return promise;
  }, [URI, id]);

  const fetchVinsInventaire = useCallback(
    async (options = {}) => {
      const { force = false } = options;
      if (!URI || !id) return { ok: false };

      const cached = inventaireCacheRef.current;
      if (cached && !force) {
        setBouteillesInventaire(cached);
        loadInventaireFromApi().then((result) => {
          if (result.ok) {
            inventaireCacheRef.current = result.data;
            setBouteillesInventaire(result.data);
          }
        });
        return { ok: true, data: cached, fromCache: true };
      }

      const result = await loadInventaireFromApi();
      if (result.ok) {
        inventaireCacheRef.current = result.data;
        setBouteillesInventaire(result.data);
      } else {
        inventaireCacheRef.current = null;
        setBouteillesInventaire([]);
      }
      return result;
    },
    [URI, id, loadInventaireFromApi]
  );

  const hasCachedInventaire = useCallback(() => {
    return inventaireCacheRef.current !== null;
  }, []);

  const prefetchVinsInventaire = useCallback(() => {
    if (!URI || !id || inventaireCacheRef.current) return;
    if (inventaireFetchInFlightRef.current) return;
    loadInventaireFromApi().then((result) => {
      if (result.ok) {
        inventaireCacheRef.current = result.data;
        setBouteillesInventaire(result.data);
      }
    });
  }, [URI, id, loadInventaireFromApi]);

  const invalidateInventaireCache = useCallback(() => {
    inventaireCacheRef.current = null;
  }, []);

  const fetchFavorisId = useCallback(
    async (utilisateur) => {
      if (!URI || !utilisateur) return;
      if (favorisFetchInFlightRef.current) {
        return favorisFetchInFlightRef.current;
      }
      const promise = fetch(
        URI + "/" + "utilisateurId" + "/" + utilisateur + "/" + "favoris"
      )
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw response;
        })
        .then((data) => {
          setFavorisId(Array.isArray(data) ? data : []);
          favorisLoadedRef.current = true;
          return data;
        })
        .catch((error) => {
          console.error("Error fetching data: ", error);
          setError(error);
          throw error;
        })
        .finally(() => {
          favorisFetchInFlightRef.current = null;
        });
      favorisFetchInFlightRef.current = promise;
      return promise;
    },
    [URI]
  );

  const loadFavorisListFromApi = useCallback(async () => {
    if (!URI || !id) return { ok: false };
    if (favorisListFetchInFlightRef.current) {
      return favorisListFetchInFlightRef.current;
    }
    const promise = (async () => {
      try {
        const response = await fetch(
          URI + "/" + "utilisateur" + "/" + id + "/" + "favoris"
        );
        if (!response.ok) throw response;
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        return { ok: true, data: list };
      } catch (error) {
        console.error("Error fetching data: ", error);
        setError(error);
        return { ok: false, error };
      } finally {
        favorisListFetchInFlightRef.current = null;
      }
    })();
    favorisListFetchInFlightRef.current = promise;
    return promise;
  }, [URI, id]);

  const fetchFavorisList = useCallback(
    async (options = {}) => {
      const { force = false } = options;
      if (!URI || !id) return { ok: false };

      const cached = favorisListCacheRef.current;
      if (cached && !force) {
        loadFavorisListFromApi().then((result) => {
          if (result.ok) {
            favorisListCacheRef.current = result.data;
          }
        });
        return { ok: true, data: cached, fromCache: true };
      }

      const result = await loadFavorisListFromApi();
      if (result.ok) {
        favorisListCacheRef.current = result.data;
      } else {
        favorisListCacheRef.current = null;
      }
      return result;
    },
    [URI, id, loadFavorisListFromApi]
  );

  const hasCachedFavoris = useCallback(() => {
    return favorisListCacheRef.current !== null;
  }, []);

  const invalidateFavorisListCache = useCallback(() => {
    favorisListCacheRef.current = null;
  }, []);

  const fetchAjouterFavoris = useCallback(
    async (vin) => {
      if (!URI || !id) return;
      const vinId = vin?.vino__bouteille_id;
      if (vinId == null || vinId === "") return;

      const payload = {
        vino__bouteille_id: vinId,
        vino__utilisateur_id: vin?.vino__utilisateur_id || id,
      };

      setFavorisId((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.some((f) => String(f.vino__bouteille_id) === String(vinId))) {
          return list;
        }
        return [...list, { vino__bouteille_id: vinId }];
      });
      favorisLoadedRef.current = true;
      invalidateFavorisListCache();

      try {
        const response = await fetch(URI + `/favoris/ajouter/favoris`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw response;
      } catch (error) {
        console.error("Error fetching data: ", error);
        setError(error);
        favorisLoadedRef.current = false;
        fetchFavorisId(id);
      }
    },
    [URI, id, fetchFavorisId, invalidateFavorisListCache]
  );

  const fetchSupprimerFavoris = useCallback(
    async (vin) => {
      if (!URI || !id || vin == null || vin === "") return;

      setFavorisId((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (f) => String(f.vino__bouteille_id) !== String(vin)
        )
      );
      favorisLoadedRef.current = true;
      invalidateFavorisListCache();

      try {
        const response = await fetch(
          URI + `/utilisateur/${id}/favoris/vin/${vin}`,
          { method: "DELETE" }
        );
        if (!response.ok) throw response;
      } catch (error) {
        console.error("Error fetching data: ", error);
        setError(error);
        favorisLoadedRef.current = false;
        fetchFavorisId(id);
      }
    },
    [URI, id, fetchFavorisId, invalidateFavorisListCache]
  );

  const ensureFavorisLoaded = useCallback(() => {
    if (!URI || !id || favorisLoadedRef.current) return;
    fetchFavorisId(id);
  }, [URI, id, fetchFavorisId]);

  const prefetchFavorisId = useCallback(() => {
    prefetchFavorisChunk();
    ensureFavorisLoaded();
    if (!favorisListCacheRef.current && !favorisListFetchInFlightRef.current) {
      loadFavorisListFromApi().then((result) => {
        if (result.ok) {
          favorisListCacheRef.current = result.data;
        }
      });
    }
  }, [ensureFavorisLoaded, loadFavorisListFromApi]);

  const hasCachedBouteilles = useCallback((cellierId) => {
    return Boolean(bouteillesCacheRef.current[String(cellierId)]);
  }, []);

  const gererBouteilles = useCallback((idBouteilles) => {
    setBouteilles(idBouteilles);
  }, []);

  const gererCellier = useCallback((idCellier) => {
    cellierActifRef.current = String(idCellier);
    setCellier(idCellier);
  }, []);

  const gererCible = useCallback((cibleId) => {
    setCible(cibleId);
  }, []);

  const prefetchAjoutBouteille = useCallback(() => {
    prefetchAjoutBouteilleChunk();
  }, []);

  const prefetchProfil = useCallback(() => {
    // Profil is eager; still warm Admin chunk for admin users.
    if (utilisateur?.privilege === "admin") {
      prefetchAdminChunk();
    }
  }, [utilisateur]);

  // Warm common lazy nav targets + inventaire data after login / user id ready.
  useEffect(() => {
    if (!isAuthenticated) return;
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback.bind(window)
      : (cb) => window.setTimeout(cb, 400);
    const cancel = window.cancelIdleCallback
      ? window.cancelIdleCallback.bind(window)
      : window.clearTimeout.bind(window);
    const handle = idle(() => {
      prefetchAjoutBouteilleChunk();
      prefetchFavorisChunk();
      if (id) {
        prefetchVinsInventaire();
      }
      if (utilisateur?.privilege === "admin") {
        prefetchAdminChunk();
      }
    });
    return () => cancel(handle);
  }, [isAuthenticated, id, utilisateur?.privilege, prefetchVinsInventaire]);

  // ---------------------------------- Rendering -----------------------------------------
  return (
    <div
      ref={appliScrollRef}
      className={isAuthenticated ? "Appli" : "Login"}
    >
      {isAuthenticated && isLocalAuth && localSession?.passwordIsDefault && (
        <div className="LocalAuthNotice" role="status">
          Mot de passe par défaut détecté — changez-le dans{" "}
          <Link to={`/profil/${encodeURIComponent(emailUtilisateur)}`}>
            Profil
          </Link>
          .
        </div>
      )}
      {isAuthenticated && (
        <NavDesktop
          emailUtilisateur={emailUtilisateur}
          gererSignOut={gererSignOut}
          utilisateur={utilisateur}
          username={username}
          prefetchVinsInventaire={prefetchVinsInventaire}
          prefetchFavorisId={prefetchFavorisId}
          prefetchAjoutBouteille={prefetchAjoutBouteille}
          prefetchProfil={prefetchProfil}
        />
      )}
      <div>
        <div>
              <Utilisateur
                utilisateur={utilisateur}
                setUtilisateur={setUtilisateur}
                utilisateurs={utilisateurs}
                setUtilisateurs={setUtilisateurs}
                username={username}
                setUsername={setUsername}
                id={id}
                setId={setId}
                emailUtilisateur={emailUtilisateur}
                setEmailUtilisateur={setEmailUtilisateur}
                fetchUtilisateurs={fetchUtilisateurs}
                fetchUtilisateur={fetchUtilisateur}
                createUser={createUser}
              />

              {/* ------------------------------ Routes --------------------------------*/}
              <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route
                  path="/profil"
                  element={
                    <ProfilRedirect emailUtilisateur={emailUtilisateur} />
                  }
                />
                <Route
                  path="/profil/"
                  element={
                    <ProfilRedirect emailUtilisateur={emailUtilisateur} />
                  }
                />
                <Route
                  path={`/profil/:emailUtilisateur`}
                  element={
                    <Profil
                      supprimerUtilisateur={supprimerUtilisateur}
                      emailUtilisateur={emailUtilisateur}
                      setEmailUtilisateur={setEmailUtilisateur}
                      utilisateur={utilisateur}
                      setUsername={setUsername}
                      username={username}
                      fetchUtilisateur={fetchUtilisateur}
                      setUtilisateur={setUtilisateur}
                      gererSignOut={gererSignOut}
                      URI={URI}
                      isLocalAuth={isLocalAuth}
                      localSession={localSession}
                      onLocalSessionUpdate={onLocalSessionUpdate}
                      passwordIsDefault={Boolean(
                        localSession?.passwordIsDefault
                      )}
                    />
                  }
                />
                <Route
                  path={`/admin/:emailUtilisateur`}
                  element={
                    <Admin
                      emailUtilisateur={emailUtilisateur}
                      setEmailUtilisateur={setEmailUtilisateur}
                      utilisateur={utilisateur}
                      setUtilisateur={setUtilisateur}
                      URI={URI}
                      bouteilles={bouteilles}
                      setBouteilles={setBouteilles}
                      error={error}
                      setError={setError}
                      gererSignOut={gererSignOut}
                      fetchVins={fetchVins}
                    />
                  }
                />
                <Route
                  path={`/cellier/:idCellier/vins`}
                  element={
                    <ListeBouteilles
                      nomCellier={nomCellier}
                      setNomCellier={setNomCellier}
                      fetchNomCellier={fetchNomCellier}
                      bouteilles={bouteilles}
                      setBouteilles={setBouteilles}
                      fetchVins={fetchVins}
                      hasCachedBouteilles={hasCachedBouteilles}
                      onBouteillePatched={onBouteillePatched}
                      gererBouteilles={gererBouteilles}
                      gererCellier={gererCellier}
                      cellier={cellier}
                      celliers={celliers}
                      URI={URI}
                      error={error}
                      setError={setError}
                      fetchUtilisateur={fetchUtilisateur}
                      fetchAjouterFavoris={fetchAjouterFavoris}
                      fetchSupprimerFavoris={fetchSupprimerFavoris}
                      fetchVinsInventaire={fetchVinsInventaire}
                      fetchStatsCelliers={fetchStatsCelliers}
                      favorisId={favorisId}
                      setFavorisId={setFavorisId}
                    />
                  }
                />
                <Route
                  path={`/cellier/:idCellier/vins/:cible`}
                  element={
                    <ListeBouteilles
                      nomCellier={nomCellier}
                      setNomCellier={setNomCellier}
                      fetchNomCellier={fetchNomCellier}
                      bouteilles={bouteilles}
                      setBouteilles={setBouteilles}
                      fetchVins={fetchVins}
                      hasCachedBouteilles={hasCachedBouteilles}
                      onBouteillePatched={onBouteillePatched}
                      gererBouteilles={gererBouteilles}
                      gererCellier={gererCellier}
                      cellier={cellier}
                      celliers={celliers}
                      URI={URI}
                      error={error}
                      setError={setError}
                      fetchUtilisateur={fetchUtilisateur}
                      fetchAjouterFavoris={fetchAjouterFavoris}
                      fetchSupprimerFavoris={fetchSupprimerFavoris}
                      fetchVinsInventaire={fetchVinsInventaire}
                      fetchStatsCelliers={fetchStatsCelliers}
                      favorisId={favorisId}
                      setFavorisId={setFavorisId}
                      cible={cible}
                    />
                  }
                />
                <Route
                  path={`/vins`}
                  element={
                    <FrmAjoutBouteille
                      bouteilles={bouteilles}
                      setBouteilles={setBouteilles}
                      fetchVins={fetchVins}
                      hasCachedBouteilles={hasCachedBouteilles}
                      onBouteilleAjoutee={onBouteilleAjoutee}
                      fetchVinsInventaire={fetchVinsInventaire}
                      fetchStatsCelliers={fetchStatsCelliers}
                      fetchCelliers={fetchCelliers}
                      gererBouteilles={gererBouteilles}
                      celliers={celliers}
                      cellier={cellier}
                      setCellier={setCellier}
                      id={id}
                      URI={URI}
                      error={error}
                      setError={setError}
                    />
                  }
                />
                <Route
                  path={`/vinsInventaire`}
                  element={
                    <ListeBouteillesInventaire
                      bouteillesInventaire={bouteillesInventaire}
                      setBouteillesInventaire={setBouteillesInventaire}
                      fetchVinsInventaire={fetchVinsInventaire}
                      hasCachedInventaire={hasCachedInventaire}
                      user_id={id}
                      URI={URI}
                      error={error}
                      setError={setError}
                      cellier={cellier}
                      fetchVins={fetchVins}
                      fetchNomCellier={fetchNomCellier}
                      gererCellier={gererCellier}
                      gererCible={gererCible}
                    />
                  }
                />
                <Route
                  path={`/`}
                  element={
                    <ListeCelliers
                      bouteilles={bouteilles}
                      setBouteilles={setBouteilles}
                      celliers={celliers}
                      setCelliers={setCelliers}
                      celliersReady={celliersReady}
                      cellier={cellier}
                      setCellier={setCellier}
                      fetchCelliers={fetchCelliers}
                      fetchStatsCelliers={fetchStatsCelliers}
                      statsCelliers={statsCelliers}
                      fetchVins={fetchVins}
                      prefetchVins={prefetchVins}
                      prefetchFavorisId={prefetchFavorisId}
                      invalidateBouteillesCache={invalidateBouteillesCache}
                      id={id}
                      emailUtilisateur={emailUtilisateur}
                      utilisateur={utilisateur}
                      gererCellier={gererCellier}
                      URI={URI}
                      error={error}
                      setError={setError}
                      userLoadError={userLoadError}
                    />
                  }
                />
                <Route
                  path={`/PW2/cellier-projet`}
                  element={
                    <ListeCelliers
                      celliers={celliers}
                      setCelliers={setCelliers}
                      celliersReady={celliersReady}
                      cellier={cellier}
                      setCellier={setCellier}
                      fetchCelliers={fetchCelliers}
                      fetchVins={fetchVins}
                      id={id}
                      emailUtilisateur={emailUtilisateur}
                      utilisateur={utilisateur}
                      gererCellier={gererCellier}
                      URI={URI}
                      error={error}
                      setError={setError}
                      userLoadError={userLoadError}
                      fetchStatsCelliers={fetchStatsCelliers}
                      statsCelliers={statsCelliers}
                      prefetchVins={prefetchVins}
                      prefetchFavorisId={prefetchFavorisId}
                      invalidateBouteillesCache={invalidateBouteillesCache}
                    />
                  }
                />
                <Route
                  path={`/cellier/ajout/celliers`}
                  element={
                    <FrmAjoutCellier
                      celliers={celliers}
                      fetchCelliers={fetchCelliers}
                      URI={URI}
                      setError={setError}
                    />
                  }
                />
                <Route
                  path={`/modifier-cellier`}
                  element={
                    <FrmModifierCellier
                      fetchCelliers={fetchCelliers}
                      URI={URI}
                      error={error}
                      setError={setError}
                    />
                  }
                />
                <Route
                  path={`/favoris`}
                  element={
                    <Favoris
                      URI={URI}
                      error={error}
                      setError={setError}
                      id={id}
                      nomCellier={nomCellier}
                      setNomCellier={setNomCellier}
                      fetchNomCellier={fetchNomCellier}
                      bouteilles={bouteilles}
                      setBouteilles={setBouteilles}
                      fetchVins={fetchVins}
                      fetchFavorisList={fetchFavorisList}
                      hasCachedFavoris={hasCachedFavoris}
                      gererBouteilles={gererBouteilles}
                      cellier={cellier}
                      celliers={celliers}
                      fetchUtilisateur={fetchUtilisateur}
                      fetchAjouterFavoris={fetchAjouterFavoris}
                      fetchSupprimerFavoris={fetchSupprimerFavoris}
                      favorisId={favorisId}
                      setFavorisId={setFavorisId}
                    />
                  }
                />
                <Route
                  path={`/aide`}
                  element={<Aide URI={URI} error={error} setError={setError} />}
                />
              </Routes>
              </Suspense>
        </div>
        <p className={isAuthenticated ? "Hidden" : "Auth-sub-title"}>
          Commencez dès maintenant votre collection de vin !
        </p>
        <NavMobile
          isAuthenticated={isAuthenticated}
          emailUtilisateur={emailUtilisateur}
          utilisateur={utilisateur}
          setIndexNav={setIndexNav}
          indexNav={indexNav}
          setResetBottomNav={setResetBottomNav}
          resetBottomNav={resetBottomNav}
          prefetchVinsInventaire={prefetchVinsInventaire}
          prefetchFavorisId={prefetchFavorisId}
          prefetchAjoutBouteille={prefetchAjoutBouteille}
          prefetchProfil={prefetchProfil}
        />
      </div>
      <PiedDePage />
    </div>
  );
};

function resolveApiUri() {
  return (
    process.env.REACT_APP_API_URI ||
    (process.env.NODE_ENV === "production" ? PROD_API_URI : DEV_API_URI)
  );
}

function AppliGate() {
  const [localSession, setLocalSession] = useState(() => readLocalSession());
  const { authStatus } = useAuthenticator((ctx) => [ctx.authStatus]);
  const apiUri = resolveApiUri();
  const onAuthScreen =
    !localSession?.token && authStatus !== "authenticated";

  // Keep html/body navy while the login shell is up so mobile overscroll
  // never flashes the default light page background.
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (onAuthScreen) {
      root.classList.add("auth-screen");
      body.classList.add("auth-screen");
    } else {
      root.classList.remove("auth-screen");
      body.classList.remove("auth-screen");
    }
    return () => {
      root.classList.remove("auth-screen");
      body.classList.remove("auth-screen");
    };
  }, [onAuthScreen]);

  if (localSession?.token) {
    return (
      <AppliContent
        localSession={localSession}
        onClearLocalSession={() => setLocalSession(null)}
        onLocalSessionUpdate={setLocalSession}
      />
    );
  }

  return (
    <Authenticator
      socialProviders={["amazon", "google"]}
      className="Authenticator"
      formFields={formFields}
      components={{
        Header() {
          return (
            <div className="Authenticator__brand">
              <SiteHomeLink tone="on-dark" />
              <img className="logo" src={Logo} alt="logo-mon-vino" />
            </div>
          );
        },
        Footer() {
          return (
            <LocalAdminLogin
              uri={apiUri}
              onSuccess={(session) => setLocalSession(session)}
            />
          );
        },
      }}
    >
      {({ user }) => <AppliContent cognitoUser={user} />}
    </Authenticator>
  );
}

const Appli = () => (
  <Authenticator.Provider>
    <AppliGate />
  </Authenticator.Provider>
);

export default Appli;
