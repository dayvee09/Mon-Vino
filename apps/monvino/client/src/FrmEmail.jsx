import * as React from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { createTheme, ThemeProvider, styled } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import { updateUserAttribute } from "./auth";
import { writeLocalSession } from "./localAuth";
import { useState, useEffect } from "react";
import "./FrmEmail.scss";
import MuiButton from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import { useNavigate } from "react-router-dom";

/**
 * Gestion de l'entrée de l'email 
 * @date 2022-09-30
 * @param {*} {username ...}
 * @returns {*}
 */
export default function FrmEmail({
	username,
	setEmailUtilisateur,
	emailUtilisateur,
	NouvelEmailUtilisateur,
	setNouvelEmailUtilisateur,
	frmEmailOuvert,
	setFrmEmailOuvert,
	URI,
	isLocalAuth = false,
	localSession = null,
	onLocalSessionUpdate = null,
}) {
	/**
	 *  État des styles des composants MUI
	 */
	const Button = styled(MuiButton)((props) => ({
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

	const CssDialogTitle = styled(DialogTitle)((props) => ({
		fontFamily: "Alata",
		color: "#152440",
		fontSize: "19px",
		marginTop: "10px",
		textAlign: "center",
	}));

	/**
	 * État de l'alerte
	 */
	const [severity, setSeverity] = useState([]);

	/**
	 * État du message retour
	 */
	const [messageRetour, setMessageRetour] = useState([]);

	/**
	 * Thème de modification du composant TextField
	 */
	const theme = createTheme({
	components: {
		MuiOutlinedInput: {
		styleOverrides: {
			root: {
			"&.Mui-focused": {
				"& .MuiOutlinedInput-notchedOutline": {
				border: `1px solid #f1ab50`,
				boxShadow: `none`,
				},
			},
			},
		},
		},
	},
	});

	/**
	 * État de l'alerte
	 */
	const Alert = React.forwardRef(function Alert(props, ref) {
		return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
	});
	const [openAlert, setOpenAlert] = React.useState(false);
	const navigate = useNavigate();
	const handleCloseAlert = (event, reason) => {
		if (reason === "clickaway") {
			return;
		}
		setOpenAlert(false);
		setFrmEmailOuvert(false);
	};

	/**
	 *  Gère l'action d'annuler
	 */
	function viderFermerFrm() {
		setFrmEmailOuvert(false);
	}

	/**
	 *  Gère l'action d'annuler
	 */
	function gererInput(e) {
		setNouvelEmailUtilisateur(e.target.value);
	}

	/**
	 * requête de modification de l'email utilisateur
	 */
	async function fetchPatchUtilisateurEmail(NouvelEmailUtilisateur) {
		// Cognito only — local admin has no Cognito session.
		if (!isLocalAuth) {
			await updateUserAttribute({
				userAttribute: {
					attributeKey: "email",
					value: NouvelEmailUtilisateur,
				},
			});
		}

		const reponse = await fetch(
			URI + "/" + "email" + "/" + emailUtilisateur + "/" + "utilisateurs",
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: NouvelEmailUtilisateur }),
			}
		);
		if (!reponse.ok) {
			let detail = "";
			try {
				const errBody = await reponse.json();
				detail = errBody?.erreur ? `: ${errBody.erreur}` : "";
			} catch {
				/* ignore */
			}
			throw new Error(`Modification refusée (HTTP ${reponse.status})${detail}`);
		}

		setEmailUtilisateur(NouvelEmailUtilisateur);

		if (isLocalAuth && localSession) {
			const nextSession = {
				...localSession,
				utilisateur: {
					...localSession.utilisateur,
					email: NouvelEmailUtilisateur,
				},
			};
			writeLocalSession(nextSession);
			onLocalSessionUpdate?.(nextSession);
			try {
				localStorage.setItem(
					"monvino.localAdminEmail",
					NouvelEmailUtilisateur
				);
			} catch {
				/* ignore */
			}
		}

		navigate(`/profil/${encodeURIComponent(NouvelEmailUtilisateur)}`, {
			replace: true,
		});
		return "SUCCESS";
	}

	/**
	 * Gère l'action de soumettre
	 */
	async function gererSoumettre() {
		setSeverity("");
		var reg = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
		setNouvelEmailUtilisateur(NouvelEmailUtilisateur);
		if (!reg.test(NouvelEmailUtilisateur)) {
			setMessageRetour("Courriel invalide");
			setSeverity("error");
			setOpenAlert(true);
			return;
		}
		try {
			await fetchPatchUtilisateurEmail(NouvelEmailUtilisateur);
			setMessageRetour("Modification effectuée");
			setSeverity("success");
		} catch (err) {
			console.error(err);
			setMessageRetour(err?.message || "Modification impossible");
			setSeverity("error");
		}
		setOpenAlert(true);
	}
	return (
	<div>
		<Dialog
		PaperProps={{ sx: { backgroundColor: "#f3f5eb" } }}
		className="dialogue"
		open={frmEmailOuvert}
		onClose={viderFermerFrm}
		>
		<CssDialogTitle>Modifier votre email</CssDialogTitle>
		<DialogContent>
			<div className="frmEmail">
			<p className="">Email actuel: {emailUtilisateur}</p>
			<ThemeProvider theme={theme}>
				<TextField
				fullWidth={true}
				onChange={gererInput}
				autoFocus
				id="email"
				type={"text"}
				defaultValue={emailUtilisateur}
				/>
			</ThemeProvider>
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
			</div>
		</DialogContent>
		<DialogActions>
			<Button onClick={viderFermerFrm} className="cancel">
			Annuler
			</Button>
			<button onClick={gererSoumettre} className="action">
			Enregistrer
			</button>
		</DialogActions>
		</Dialog>
	</div>
	);
}