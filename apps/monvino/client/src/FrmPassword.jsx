import * as React from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { updatePassword } from "./auth";
import { localChangePassword, writeLocalSession } from "./localAuth";
import { useState, useEffect } from "react";
import "./FrmPassword.scss";
import { createTheme, ThemeProvider, styled } from "@mui/material/styles";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import MuiButton from "@mui/material/Button";
import { PasswordField, Button } from "@aws-amplify/ui-react";

/**
 * Gestion du mot de passe d'un utilisateur connecté
 * @date 2022-09-30
 * @param {*} {setFrmPasswordOuvert ... }
 * @returns {*}
 */
export default function FrmPassword({
	setFrmPasswordOuvert,
	frmPasswordOuvert,
	passwordActuel,
	setPasswordActuel,
	passwordNouveau,
	setPasswordNouveau,
	isLocalAuth = false,
	localSession = null,
	URI = "",
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
	fontSize: "20px",
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
	useEffect(() => {
		if (messageRetour === "Modification effectuée") {
			setSeverity("success");
		} else if (messageRetour === "Courriel invalide") {
			setSeverity("error");
		}
	}, [messageRetour]);

	/**
	 * État du booléen pour le choix de l'option severity
	 */
	const [bool, setBool] = useState(false);

	/**
	 * État de l'alerte
	 */
	const Alert = React.forwardRef(function Alert(props, ref) {
	return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
	});
	const [openAlert, setOpenAlert] = React.useState(false);
	const handleCloseAlert = (event, reason) => {
		if (reason === "clickaway") {
			return;
		}
		setOpenAlert(false);
		setFrmPasswordOuvert(false);
		setSeverity("");
	};

	/**
	 * État du message d'erreur du password
	 */
	// Align with Cognito policy: upper, lower, digit, symbol; special chars allowed.
	const validationRegex =
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
	const errorMessage =
		"Majuscule, minuscule, chiffre, caractère spécial et 8 caractères minimum requis";

	/**
	 *  Gère l'action d'annuler
	 */
	function viderFermerFrm() {
		setFrmPasswordOuvert(false);
	}

	/**
	 * Modification du mot de passe (Cognito ou session locale MySQL).
	 */
	async function PatchPassword(passwordActuel, nouveauPassword) {
		setBool(false);
		setMessageRetour("");
		setSeverity("");
		try {
			if (isLocalAuth) {
				if (!URI || !localSession?.token) {
					throw new Error("Session locale invalide");
				}
				await localChangePassword(
					URI,
					localSession.token,
					passwordActuel,
					nouveauPassword
				);
				const nextSession = {
					...localSession,
					passwordIsDefault: false,
				};
				writeLocalSession(nextSession);
				onLocalSessionUpdate?.(nextSession);
				setMessageRetour("Modification effectuée");
				return;
			}
			await updatePassword({
				oldPassword: passwordActuel,
				newPassword: nouveauPassword,
			});
			setMessageRetour("Modification effectuée");
		} catch (err) {
			console.log(err);
			setMessageRetour(
				err?.message && isLocalAuth
					? err.message
					: "Courriel invalide"
			);
		}
	}

	/**
	 * Gère l'action de soumettre
	 */
	function gererSoumettre() {
		if (validationRegex.test(passwordNouveau)) {
			PatchPassword(passwordActuel, passwordNouveau);
			setOpenAlert(true);
		}
	}

	return (
	<div>
		<Dialog
		PaperProps={{ sx: { backgroundColor: "#f3f5eb" } }}
		open={frmPasswordOuvert}
		onClose={viderFermerFrm}
		>
		<CssDialogTitle>Modifier votre mot de passe</CssDialogTitle>
		<DialogContent>
			<div className="frmPassword">
			<PasswordField
				className="PasswordField"
				onChange={(event) => setPasswordActuel(event.target.value)}
				autoFocus
				label="Mot de passe actuel"
				id="Mot_de_passe_actuel"
			/>
			<div className="frmPassword__new">
				<PasswordField
					className="PasswordField"
					onChange={(event) => setPasswordNouveau(event.target.value)}
					hasError={
						Boolean(passwordNouveau) &&
						!validationRegex.test(passwordNouveau)
					}
					errorMessage={errorMessage}
					label="Nouveau mot de passe"
					id="Nouveau_mot_de_passe"
				/>
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