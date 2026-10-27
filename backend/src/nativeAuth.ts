import express from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";

export const nativeAuthRouter = express.Router();

type LoginAttempt = {
    secret: string;
    started: boolean;
    expiresAt: number;
    pairingCode?: string;
};

const attempts = new Map<string, LoginAttempt>();

function removeExpiredAttempts() {
    const now = Date.now();

    for (const [id, attempt] of attempts) {
        if (now >= attempt.expiresAt) {
            attempts.delete(id);
        }
    }
}

nativeAuthRouter.use((_req, res, next) => {
    removeExpiredAttempts();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
});

// The app creates an attempt before opening Epic's login.
// The secret stays in the app and is never put into a browser URL.
nativeAuthRouter.post("/start", (_req, res) => {
    if (attempts.size >= 100) {
        res.status(503).json({
            error: "Too many pending sign-ins. Try again shortly.",
        });
        return;
    }

    const id = randomBytes(32).toString("hex");
    const secret = randomBytes(32).toString("hex");

    attempts.set(id, {
        secret,
        started: false,
        expiresAt: Date.now() + 10 * 60 * 1000,
    });

    res.json({
        id,
        secret,
        loginUrl:
            "http://localhost:3001/api/epic/login?mobile=" +
            encodeURIComponent(id),
    });
});

// Called by epic.ts before redirecting the browser to Epic.
export function beginNativeLogin(id: string): boolean {
    removeExpiredAttempts();

    const attempt = attempts.get(id);

    if (!attempt || attempt.started) {
        return false;
    }

    attempt.started = true;
    return true;
}

// Called only after the backend completes Epic authorization.
export function completeNativeLogin(
    id: string,
    pairingCode: string
): boolean {
    removeExpiredAttempts();

    const attempt = attempts.get(id);

    if (!attempt || !attempt.started || attempt.pairingCode) {
        return false;
    }

    attempt.pairingCode = pairingCode;

    // Allow one minute for the app to collect the result.
    attempt.expiresAt = Date.now() + 60 * 1000;

    return true;
}

// The app must prove it owns the attempt before collecting the result.
nativeAuthRouter.post("/claim", (req, res) => {
    const id =
        typeof req.body?.id === "string" ? req.body.id : "";

    const authorization = req.get("Authorization") ?? "";

    const secret = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : "";

    const attempt = attempts.get(id);

    if (
        !attempt ||
        !/^[a-f0-9]{64}$/.test(secret) ||
        !timingSafeEqual(
            Buffer.from(secret, "hex"),
            Buffer.from(attempt.secret, "hex")
        )
    ) {
        res.status(401).json({
            error: "This sign-in attempt is invalid or expired.",
        });
        return;
    }

    if (!attempt.pairingCode) {
        res.status(409).json({
            error: "Epic authorization has not finished.",
        });
        return;
    }

    const code = attempt.pairingCode;

    // The result may only be collected once.
    attempts.delete(id);

    res.json({ code });
});