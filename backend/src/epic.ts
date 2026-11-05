import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import express from "express";
import type { ErrorRequestHandler } from "express";
import session from "express-session";
import { prepareMobileDemo } from "./mobileDemo.js";
import {
    beginNativeLogin,
    completeNativeLogin,
} from "./nativeAuth.js";

declare module "express-session" {
    interface SessionData {
        epicLogin?: {
            state: string;
            verifier: string;
            createdAt: number;
            mobileAttemptId?: string;
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

// This implementation is specifically for the local sandbox.
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
            secure: false, // Local HTTP sandbox only.
            path: "/api/epic",
            maxAge: 60 * 60 * 1000,
        },
    })
);

// Do not cache authentication pages or sandbox records.
epicRouter.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
});

// Start Epic's patient authorization process.
epicRouter.get("/login", async (req, res) => {
    const mobileAttemptId =
        typeof req.query.mobile === "string"
            ? req.query.mobile
            : undefined;

    if (
        req.query.mobile !== undefined &&
        (!mobileAttemptId || !beginNativeLogin(mobileAttemptId))
    ) {
        res.status(400).send(
            "This mobile sign-in expired or was already started. " +
            "Return to EZ Healthcare and try again."
        );
        return;
    }

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
        ...(mobileAttemptId ? { mobileAttemptId } : {}),
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
            ...(process.env.EPIC_PRACTITIONER_SCOPE?.trim() ? [process.env.EPIC_PRACTITIONER_SCOPE.trim()] : []),
        ].join(" "),
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
    }).toString();

    console.log("Epic requested scopes:", url.searchParams.get("scope"));

    await new Promise<void>((resolve, reject) => {
        req.session.save((error) => {
            if (error) reject(error);
            else resolve();
        });
    });

    res.redirect(url.toString());
});

// Epic sends the browser here after authorization.
epicRouter.get("/callback", async (req, res) => {
    const pending = req.session.epicLogin;

    const returnedState =
        typeof req.query.state === "string"
            ? req.query.state
            : "";

    if (
        !pending ||
        returnedState !== pending.state ||
        Date.now() - pending.createdAt > 10 * 60 * 1000
    ) {
        res.status(400).send(
            "Sign-in expired or could not be verified. " +
            "Return to EZ Healthcare and start a new sign-in."
        );
        return;
    }

    // Each authorization attempt can only be completed once.
    delete req.session.epicLogin;

    await new Promise<void>((resolve, reject) => {
        req.session.save((error) => {
            if (error) reject(error);
            else resolve();
        });
    });

    if (req.query.error) {
        res.status(400).send(
            "Epic authorization was not completed. " +
            "Return to EZ Healthcare and try again."
        );
        return;
    }

    const code =
        typeof req.query.code === "string"
            ? req.query.code
            : "";

    if (!code) {
        res.status(400).send(
            "Epic did not return an authorization code."
        );
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
    console.log("Epic granted scopes:", token.scope ?? "(not returned)");

    if (!response.ok) {
        res.status(502).json({
            error: "Epic token exchange failed.",
            epicStatus: response.status,
            epicError:
                typeof token.error === "string"
                    ? token.error
                    : "Unknown error",
        });
        return;
    }

    if (
        typeof token.access_token !== "string" ||
        typeof token.patient !== "string" ||
        typeof token.expires_in !== "number" ||
        !Number.isFinite(token.expires_in) ||
        token.expires_in <= 0
    ) {
        res.status(502).json({
            error:
                "Epic did not return the expected token " +
                "and patient context.",
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

    // Epic tokens stay in backend memory.
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

    if (pending.mobileAttemptId) {
        const pairingCode = await prepareMobileDemo(
            req.session.epicConnection!
        );

        const completed = completeNativeLogin(
            pending.mobileAttemptId,
            pairingCode
        );

        if (!completed) {
            res.status(400).send(
                "The mobile sign-in expired. " +
                "Return to EZ Healthcare and connect again."
            );
            return;
        }

        const returnUrl = new URL("ezhealthcare://medications");

        returnUrl.searchParams.set("epic", "connected");
        returnUrl.searchParams.set(
            "attempt",
            pending.mobileAttemptId
        );

        // Escape the URL for use inside an HTML attribute.
        // No Epic token or pairing code is placed in this link.
        const appLink = returnUrl
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        console.log("Mobile authorization return page sent.");

        res.type("html").send(`
            <!doctype html>
            <html lang="en">
              <head>
                <meta charset="utf-8">
                <meta
                  name="viewport"
                  content="width=device-width, initial-scale=1"
                >
                <title>Connected to EZ Healthcare</title>
              </head>
              <body
                style="
                  font-family: sans-serif;
                  padding: 32px;
                  color: #0B2236;
                  background: #F7F8F3;
                "
              >
                <h1>Epic connection successful</h1>

                <p>Your sandbox medication records are ready.</p>

                <a
                  href="${appLink}"
                  target="_top"
                  style="
                    display: inline-block;
                    padding: 18px 24px;
                    background: #17618E;
                    color: white;
                    border-radius: 12px;
                    text-decoration: none;
                    font-size: 20px;
                  "
                >
                  Return to EZ Healthcare
                </a>

                <p>
                  Tap the button within one minute
                  to finish connecting.
                </p>

                <p>This connection uses synthetic sandbox data.</p>
              </body>
            </html>
        `);
        return;
    }

    // Preserve the original desktop authorization flow.
    res.redirect("/api/epic/status");
});

// Require a valid Epic session for the routes below.
epicRouter.use((req, res, next) => {
    const connection = req.session.epicConnection;

    if (!connection || Date.now() >= connection.expiresAt) {
        delete req.session.epicConnection;

        res.status(401).json({
            error:
                "Sign in to Epic first, or sign in again " +
                "if your session expired.",
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
              <li>
                <a href="/api/epic/patient">
                  View sandbox patient
                </a>
              </li>
              <li>
                <a href="/api/epic/medications">
                  View medication orders
                </a>
              </li>
            </ul>
            <p>This demonstration uses synthetic sandbox data.</p>
          </body>
        </html>
    `);
});

// Return the authorized patient's FHIR record.
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

// Return the first page of medication orders.
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

    console.log(
        `Epic MedicationRequest: HTTP ${response.status}`
    );

    res.status(response.status).json(data);
});

// Preserve the manual pairing page as a fallback.
epicRouter.get("/mobile", async (req, res) => {
    const connection = req.session.epicConnection!;
    const code = await prepareMobileDemo(connection);

    res.type("html").send(`
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            >
            <title>Pair EZ Healthcare</title>
          </head>
          <body
            style="
              font-family: sans-serif;
              padding: 32px;
              color: #0B2236;
            "
          >
            <h1>Connect your Android demo</h1>
            <p>Open Medications in EZ Healthcare and enter this code:</p>
            <p
              style="
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 4px;
              "
            >
              ${code}
            </p>
            <p>The code expires in five minutes and can be used once.</p>
            <p>
              The saved Epic sandbox data remains available
              for 30 minutes.
            </p>
            <p>Reload this page to retrieve a new snapshot and code.</p>
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

    if (res.headersSent) {
        _next(error);
        return;
    }

    res.status(502).json({
        error:
            "The Epic request could not be completed. " +
            "Try signing in again.",
    });
};

epicRouter.use(handleEpicError);

export default epicRouter;
