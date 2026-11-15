import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import "./index.scss";
import Appli from "./Appli";
import { Amplify } from "aws-amplify";
import config from "./aws-exports";

// User Pool + OAuth only. The Cognito Identity Pool in aws-exports returns
// 400s locally and Amplify then retries until Cognito rate-limits the browser.
const { aws_cognito_identity_pool_id: _unusedIdentityPool, ...authConfig } =
  config;
Amplify.configure(authConfig);

const eltRacine = ReactDOM.createRoot(document.getElementById("racine"));
eltRacine.render(
  <React.StrictMode>
    <Router>
      <Appli />
    </Router>
  </React.StrictMode>
);
