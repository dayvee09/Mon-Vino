import "./Admin.scss";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import FrmSaq from "./FrmSaq";
import Chargement from "./Chargement";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import { useNavigate } from "react-router-dom";

/**
 * Gestion de l'admin — synchronisation SAQ en un seul flux serveur (NDJSON).
 */
export default function Admin(props) {
	const [nbBouteillesSaq, setNbBouteillesSaq] = useState(0);
	const [syncActif, setSyncActif] = useState(false);
	const [prevGo, setPrevGo] = useState(false);
	const [cycleImportation, setCycleImportation] = useState(0);
	const [syncMessage, setSyncMessage] = useState("");
	const [syncDoneCount, setSyncDoneCount] = useState(0);
	const [frmOuvert, setFrmOuvert] = useState(false);
	const [syncAnnulee, setSyncAnnulee] = useState(false);
	const syncEnCours = useRef(false);
	const abortRef = useRef(null);

	const Alert = React.forwardRef(function Alert(props, ref) {
		return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
	});
	const [openAlert, setOpenAlert] = React.useState(false);
	const [openAlertLoading, setOpenAlertLoading] = React.useState(false);
	const handleCloseAlert = (event, reason) => {
		if (reason === "clickaway") {
			return;
		}
		setOpenAlert(false);
		setSyncAnnulee(false);
	};
	const navigate = useNavigate();

	function gererSaq() {
		setFrmOuvert(true);
	}

	function annulerSynchronisation() {
		// Signal PHP to stop between chunks, then abort the stream reader.
		fetch(props.URI + "/admin/importer/saq", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ mode: "cancel" }),
		}).catch(() => {});
		abortRef.current?.abort();
		setOpenAlertLoading(false);
		setSyncActif(false);
		setSyncAnnulee(true);
		setOpenAlert(true);
		setCycleImportation(0);
		setNbBouteillesSaq(0);
		setPrevGo(false);
		setSyncMessage("");
		syncEnCours.current = false;
	}

	useEffect(() => {
		if (!syncActif || syncEnCours.current) {
			return;
		}

		syncEnCours.current = true;
		const controller = new AbortController();
		abortRef.current = controller;

		(async () => {
			try {
				setSyncAnnulee(false);
				setCycleImportation(0);
				setNbBouteillesSaq(0);
				setSyncDoneCount(0);
				setPrevGo(false);
				setSyncMessage("Préparation du plan SAQ…");

				const response = await fetch(props.URI + "/admin/importer/saq", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ mode: "full" }),
					signal: controller.signal,
				});
				if (!response.ok || !response.body) {
					throw new Error(`Sync HTTP ${response.status}`);
				}

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed) continue;
						let event;
						try {
							event = JSON.parse(trimmed);
						} catch {
							continue;
						}

						if (event.vinType) {
							setPrevGo(event.vinType);
						}
						if (typeof event.total === "number") {
							setNbBouteillesSaq(event.total);
						}
						if (typeof event.done === "number") {
							setSyncDoneCount(event.done);
						}
						if (typeof event.percent === "number") {
							setCycleImportation(event.percent);
						}
						if (event.phase === "plan") {
							setSyncMessage(
								event.vinType
									? `Plan catalogue — ${event.typeTotal ?? 0} ${event.vinType} (total ${event.total ?? 0})`
									: "Préparation du plan SAQ…"
							);
						} else if (event.phase === "import") {
							const done = typeof event.done === "number" ? event.done : 0;
							const total = typeof event.total === "number" ? event.total : 0;
							const pct = typeof event.percent === "number" ? event.percent : 0;
							const label = event.vinType || "catalogue";
							setSyncMessage(
								`Synchronisation SAQ — ${done}/${total} (${label}, ${pct}%)`
							);
						} else if (typeof event.message === "string" && event.message) {
							setSyncMessage(event.message);
						}

						if (event.type === "done") {
							setCycleImportation(100);
							setSyncMessage("Synchronisation terminée");
							setOpenAlertLoading(false);
							setOpenAlert(true);
							setNbBouteillesSaq(0);
							setPrevGo(false);
						} else if (event.type === "cancelled") {
							setSyncAnnulee(true);
							setOpenAlertLoading(false);
							setOpenAlert(true);
						} else if (event.type === "error") {
							throw new Error(event.erreur || "Erreur de synchronisation");
						}
					}
				}
			} catch (error) {
				if (error?.name === "AbortError") {
					setSyncAnnulee(true);
					setOpenAlertLoading(false);
					setOpenAlert(true);
					return;
				}
				console.error("Error fetching data: ", error);
				props.setError?.(error);
				setOpenAlertLoading(false);
			} finally {
				syncEnCours.current = false;
				setSyncActif(false);
				if (abortRef.current === controller) {
					abortRef.current = null;
				}
			}
		})();

		return () => {
			controller.abort();
		};
	}, [syncActif]);

	const redirectionAccueil = function () {
		props.gererSignOut();
		const timer = setTimeout(() => {
			navigate("/", { replace: true });
		}, 2000);
		return () => clearTimeout(timer);
	};

	return (
		<>
			<div className="Appli--entete">
				<div className="Appli--signOut-container">
					<button className="Appli--signOut" onClick={redirectionAccueil}>
						Déconnexion
					</button>
				</div>
			</div>
			<div className="Appli--container">
				<div className="Admin">
					<div className="content-admin">
						<h1>Bienvenue sur l'interface d'admin!</h1>
						<div>
							<button
								className="importer-admin"
								onClick={gererSaq}
								disabled={openAlertLoading}
							>
								Synchroniser avec la base de données de la Saq
							</button>
						</div>
					</div>
					<Snackbar
						sx={{ height: "100%" }}
						anchorOrigin={{
							vertical: "top",
							horizontal: "center",
						}}
						open={openAlert}
						autoHideDuration={3000}
						onClose={handleCloseAlert}
					>
						<Alert
							onClose={handleCloseAlert}
							severity={syncAnnulee ? "warning" : "success"}
							sx={[
								{
									width: "100%",
									backgroundColor: "#152440",
									border: "1px solid #f1ab50",
								},
							]}
						>
							{syncAnnulee
								? "Synchronisation SAQ annulée."
								: "La synchronisation avec la base de données de la SAQ a été faite avec succès!"}
						</Alert>
					</Snackbar>
					<Dialog
						className="Admin__sync-dialog"
						open={openAlertLoading}
						disableEscapeKeyDown
						onClose={() => {}}
						slotProps={{
							paper: {
								className: "Admin__sync-paper",
							},
						}}
					>
						<DialogContent>
							<Chargement
								className="chargement--compact"
								message={
									syncMessage ||
									(nbBouteillesSaq < 1
										? "Synchronisation SAQ — initialisation…"
										: `Synchronisation SAQ — ${syncDoneCount}/${nbBouteillesSaq} (${prevGo || "catalogue"}, ${cycleImportation}%)`)
								}
							/>
						</DialogContent>
						<DialogActions className="Admin__sync-actions">
							<button
								type="button"
								className="Admin__cancel-sync"
								onClick={annulerSynchronisation}
							>
								Annuler
							</button>
						</DialogActions>
					</Dialog>
					<FrmSaq
						frmOuvert={frmOuvert}
						setFrmOuvert={setFrmOuvert}
						setSyncActif={setSyncActif}
						setOpenAlertLoading={setOpenAlertLoading}
					/>
				</div>
			</div>
		</>
	);
}
