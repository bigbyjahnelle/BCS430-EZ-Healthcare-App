import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import express from "express";
import type { ErrorRequestHandler } from "express";
import session from "express-session";
import { prepareMobileDemo } from "./mobileDemo.js";

declare module "express-session" {
    interface SessionData {
        epicLogin?: {
            state: string;
            verifier: string;
            createdAt: number;
        };
        epicConnection?: {
            accessToken: string;
            patientId: string;
            expiresAt: number;
        };
    }
}

const epicRouter = express.Router();

const clientId = process.env.EPIC_CLIENT_ID;
const redirectUri = process.env.EPIC_REDIRECT_URI;
const fhirBaseUrl = process.env.EPIC_FHIR_BASE_URL;

const sandboxBase =
    "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4";

const authorizeUrl =
    "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize";

const tokenUrl =
    "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token";

if (!clientId || !redirectUri || !fhirBaseUrl) {
    throw new Error("Missing Epic settings in backend/.env.");
}

// This implementation is specifically for the local sandbox demo.
if (
    fhirBaseUrl !== sandboxBase ||
    redirectUri !== "http://localhost:3001/api/epic/callback"
) {
    throw new Error("Check the Epic sandbox URLs in backend/.env.");
}

epicRouter.use(
    session({
        name: "ez.epic.sid",
        secret: randomBytes(32).toString("hex"),
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: false, // Local HTTP demo only.
            path: "/api/epic",
            maxAge: 60 * 60 * 1000,
        },
    })
);

// Do not cache authentication pages or returned sandbox records.
epicRouter.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
});

// Start Epic's patient sign-in process.
epicRouter.get("/login", async (req, res) => {
    await new Promise<void>((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) reject(error);
            else resolve();
        });
    });

    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");

    const challenge = createHash("sha256")
        .update(verifier)
        .digest("base64url");

    req.session.epicLogin = {
        state,
        verifier,
        createdAt: Date.now(),
    };

    const url = new URL(authorizeUrl);

    url.search = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        aud: fhirBaseUrl,
        scope: [
            "launch/patient",
            "patient/Patient.read",
            "patient/MedicationRequest.read",
            "patient/Medication.read",
        ].join(" "),
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
    }).toString();

    await new Promise<void>((resolve, reject) => {
        req.session.save((error) => {
            if (error) reject(error);
            else resolve();
        });
    });

    res.redirect(url.toString());
});

// Epic sends the browser here after the patient signs in.
epicRouter.get("/callback", async (req, res) => {
    const pending = req.session.epicLogin;

    const returnedState =
        typeof req.query.state === "string" ? req.query.state : "";

    if (
        !pending ||
        returnedState !== pending.state ||
        Date.now() - pending.createdAt > 10 * 60 * 1000
    ) {
        res.status(400).send(
            "Sign-in expired or could not be verified. Start again at /api/epic/login."
        );
        return;
    }

    // Each sign-in attempt can only be completed once.
    delete req.session.epicLogin;

    await new Promise<void>((resolve, reject) => {
        req.session.save((error) => {
            if (error) reject(error);
            else resolve();
        });
    });

    if (req.query.error) {
        res.status(400).send(
            "Epic authorization was not completed. Start again at /api/epic/login."
        );
        return;
    }

    const code =
        typeof req.query.code === "string" ? req.query.code : "";

    if (!code) {
        res.status(400).send("Epic did not return an authorization code.");
        return;
    }

    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: pending.verifier,
        }),
        signal: AbortSignal.timeout(15000),
    });

    const token = await response.json();

    if (!response.ok) {
        res.status(502).json({
            error: "Epic token exchange failed.",
            epicStatus: response.status,
            epicError:
                typeof token.error === "string" ? token.error : "Unknown error",
        });
        return;
    }

    if (
        typeof token.access_token !== "string" ||
        typeof token.patient !== "string" ||
        typeof token.expires_in !== "number" ||
        token.expires_in <= 0
    ) {
        res.status(502).json({
            error: "Epic did not return the expected token and patient context.",
        });
        return;
    }

    // Rotate the session ID after successful authorization.
    await new Promise<void>((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) reject(error);
            else resolve();
        });
    });

    // Tokens remain in backend memory, not in the browser response.
    req.session.epicConnection = {
        accessToken: token.access_token,
        patientId: token.patient,
        expiresAt: Date.now() + token.expires_in * 1000,
    };

    await new Promise<void>((resolve, reject) => {
        req.session.save((error) => {
            if (error) reject(error);
            else resolve();
        });
    });

    console.log("Epic sandbox authorization completed.");
    res.redirect("/api/epic/status");
});

// Require a valid Epic session for the routes below.
epicRouter.use((req, res, next) => {
    const connection = req.session.epicConnection;

    if (!connection || Date.now() >= connection.expiresAt) {
        delete req.session.epicConnection;

        res.status(401).json({
            error: "Sign in to Epic first, or sign in again if your session expired.",
            loginUrl: "http://localhost:3001/api/epic/login",
        });
        return;
    }

    next();
});

epicRouter.get("/status", (_req, res) => {
    res.type("html").send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>EZ Healthcare — Epic Sandbox</title>
      </head>
      <body>
        <h1>Connected to Epic's sandbox</h1>
        <p>Authorization succeeded. Choose a request to test:</p>
        <ul>
          <li><a href="/api/epic/patient">View sandbox patient</a></li>
          <li><a href="/api/epic/medications">View medication orders</a></li>
        </ul>
        <p>This demonstration uses synthetic sandbox data.</p>
      </body>
    </html>
  `);
});

// Return the authorized sandbox patient's FHIR record.
epicRouter.get("/patient", async (req, res) => {
    const connection = req.session.epicConnection!;

    const url =
        `${fhirBaseUrl}/Patient/` +
        encodeURIComponent(connection.patientId);

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            Accept: "application/fhir+json",
        },
        signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();

    console.log(`Epic Patient request: HTTP ${response.status}`);
    res.status(response.status).json(data);
});

// Return the first page of medication orders for that patient.
epicRouter.get("/medications", async (req, res) => {
    const connection = req.session.epicConnection!;

    const url = new URL(`${fhirBaseUrl}/MedicationRequest`);
    url.searchParams.set("patient", connection.patientId);

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            Accept: "application/fhir+json",
        },
        signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();

    console.log(`Epic MedicationRequest: HTTP ${response.status}`);
    res.status(response.status).json(data);
});

// This route is protected by the Epic session check above it.
epicRouter.get("/mobile", async (req, res) => {
    const connection = req.session.epicConnection!;

    const code = await prepareMobileDemo(connection);

    res.type("html").send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Pair EZ Healthcare</title>
      </head>
      <body style="font-family: sans-serif; padding: 32px; color: #0B2236;">
        <h1>Connect your Android demo</h1>
        <p>Open Medications in EZ Healthcare and enter this code:</p>
        <p style="font-size: 36px; font-weight: bold; letter-spacing: 4px;">
          ${code}
        </p>
        <p>The code expires in five minutes and can be used once.</p>
        <p>The saved Epic sandbox data remains available for 30 minutes.</p>
        <p>Reload this page to retrieve a new snapshot and pairing code.</p>
      </body>
    </html>
  `);
});

const handleEpicError: ErrorRequestHandler = (
    error,
    _req,
    res,
    _next
) => {
    console.error(
        "Epic connection error:",
        error instanceof Error ? error.message : "Unknown error"
    );

    res.status(502).json({
        error: "The Epic request could not be completed. Try signing in again.",
    });
};

epicRouter.use(handleEpicError);

export default epicRouter;