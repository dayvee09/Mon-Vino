import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import "./index.scss";
import Appli from "./Appli";
import { Amplify } from "aws-amplify";
import config from "./aws-exports";

// Matches package.json "homepage": "/monvino".
const publicUrl = process.env.PUBLIC_URL || "/monvino";
const routerBasename =
  publicUrl === "/" ? "" : publicUrl.replace(/\/$/, "");

function splitRedirects(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Amplify picks a redirect that matches window.location.origin (+ path). */
function redirectsForCurrentOrigin(configured) {
  const appPath = `${routerBasename}/` || "/";
  const current = `${window.location.origin}${appPath}`;
  return [...new Set([current, ...configured])];
}

const redirectSignIn = redirectsForCurrentOrigin(
  splitRedirects(config.oauth?.redirectSignIn)
);
const redirectSignOut = redirectsForCurrentOrigin(
  splitRedirects(config.oauth?.redirectSignOut)
);

// Explicit Amplify v6 Auth config (User Pool + OAuth only — no Identity Pool).
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.aws_user_pools_id,
      userPoolClientId: config.aws_user_pools_web_client_id,
      loginWith: {
        email: true,
        oauth: {
          domain: config.oauth.domain,
          // Must match Cognito app client scopes (Login pages).
          scopes: ["email", "openid", "profile"],
          redirectSignIn,
          redirectSignOut,
          responseType: "code",
          providers: ["Google", "Amazon"],
        },
      },
    },
  },
});

if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line no-console
  console.info("[Mon Vino OAuth]", {
    location: window.location.href,
    origin: window.location.origin,
    redirectSignIn,
  });
}

const eltRacine = ReactDOM.createRoot(document.getElementById("racine"));
eltRacine.render(
  <React.StrictMode>
    <Router basename={routerBasename}>
      <Appli />
    </Router>
  </React.StrictMode>
);
