import express from "express";
import { randomBytes } from "node:crypto";

export const mobileDemoRouter = express.Router();

type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  status: string;
  authoredOn: string;
};

type Snapshot = {
  source: string;
  fetchedAt: string;
  expiresAt: number;
  patient: {
    id: string;
    name: string;
  };
  medications: Medication[];
  warnings: string[];
};

type MedicationResource = {
  resourceType: string;
  id?: string;
  status?: string;
  authoredOn?: string;
  subject?: { reference?: string };
  medicationReference?: { display?: string };
  medicationCodeableConcept?: {
    text?: string;
    coding?: { display?: string }[];
  };
  dosageInstruction?: {
    text?: string;
    patientInstruction?: string;
    timing?: { code?: { text?: string } };
    doseAndRate?: {
      type?: { coding?: { code?: string }[] };
      doseQuantity?: { value?: number; unit?: string };
    }[];
  }[];
  issue?: {
    severity?: string;
    details?: { text?: string };
  }[];
};

const pendingCodes = new Map<
  string,
  { snapshot: Snapshot; expiresAt: number }
>();

const connections = new Map<string, Snapshot>();

const fhirBase =
  "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4";

function removeExpiredItems() {
  const now = Date.now();

  for (const [code, item] of pendingCodes) {
    if (now >= item.expiresAt) pendingCodes.delete(code);
  }

  for (const [token, snapshot] of connections) {
    if (now >= snapshot.expiresAt) connections.delete(token);
  }
}

function normalizeMedication(resource: MedicationResource): Medication {
  const dose = resource.dosageInstruction?.[0];
  const quantities = dose?.doseAndRate ?? [];

  const ordered = quantities.find((item) =>
    item.type?.coding?.some((code) => code.code === "ordered")
  );

  const quantity = (ordered ?? quantities[0])?.doseQuantity;

  return {
    id: resource.id!,
    name:
      resource.medicationReference?.display ||
      resource.medicationCodeableConcept?.text ||
      resource.medicationCodeableConcept?.coding?.[0]?.display ||
      "Medication name not provided",
    dosage:
      quantity?.value != null
        ? `${quantity.value} ${quantity.unit ?? ""}`.trim()
        : "Not provided",
    frequency: dose?.timing?.code?.text || "Not provided",
    instructions:
      dose?.patientInstruction || dose?.text || "Not provided",
    status: resource.status || "unknown",
    authoredOn: resource.authoredOn || "Not provided",
  };
}

// Called only from the authenticated Epic browser session.
export async function prepareMobileDemo(connection: {
  accessToken: string;
  patientId: string;
}) {
  removeExpiredItems();

  const headers = {
    Authorization: `Bearer ${connection.accessToken}`,
    Accept: "application/fhir+json",
  };

  const medicationUrl = new URL(`${fhirBase}/MedicationRequest`);
  medicationUrl.searchParams.set("patient", connection.patientId);

  const [patientResponse, medicationResponse] = await Promise.all([
    fetch(
      `${fhirBase}/Patient/${encodeURIComponent(connection.patientId)}`,
      { headers, signal: AbortSignal.timeout(15000) }
    ),
    fetch(medicationUrl, {
      headers,
      signal: AbortSignal.timeout(15000),
    }),
  ]);

  if (!patientResponse.ok || !medicationResponse.ok) {
    throw new Error(
      `Epic requests failed: Patient ${patientResponse.status}, ` +
      `MedicationRequest ${medicationResponse.status}`
    );
  }

  const patient = await patientResponse.json();
  const bundle = await medicationResponse.json();

  if (
    patient.resourceType !== "Patient" ||
    patient.id !== connection.patientId ||
    bundle.resourceType !== "Bundle"
  ) {
    throw new Error("Epic returned an unexpected patient or medication response.");
  }

  const resources: MedicationResource[] = (bundle.entry ?? [])
    .map((entry: { resource?: MedicationResource }) => entry.resource)
    .filter((resource: MedicationResource | undefined) => Boolean(resource));

  const warnings: string[] = [];

  for (const resource of resources) {
    if (resource.resourceType !== "OperationOutcome") continue;

    for (const issue of resource.issue ?? []) {
      if (issue.severity === "error" || issue.severity === "fatal") {
        throw new Error("Epic reported an error retrieving medication data.");
      }

      if (issue.details?.text) {
        warnings.push(issue.details.text);
      }
    }
  }

  // This demo retrieves one page and clearly identifies extra pages.
  if (
    bundle.link?.some(
      (link: { relation?: string }) => link.relation === "next"
    )
  ) {
    warnings.push(
      "Only the first page of medication orders is included in this demo."
    );
  }

  const medicationResources = resources.filter(
    (resource) => resource.resourceType === "MedicationRequest"
  );

  for (const resource of medicationResources) {
    if (
      !resource.id ||
      resource.subject?.reference !== `Patient/${connection.patientId}`
    ) {
      throw new Error("A medication order could not be matched to this patient.");
    }
  }

  const patientName =
    patient.name?.find(
      (name: { use?: string }) => name.use === "official"
    ) ?? patient.name?.[0];

  const snapshot: Snapshot = {
    source: "Epic sandbox",
    fetchedAt: new Date().toISOString(),
    expiresAt: Date.now() + 30 * 60 * 1000,
    patient: {
      id: connection.patientId,
      name:
        patientName?.text ||
        [...(patientName?.given ?? []), patientName?.family]
          .filter(Boolean)
          .join(" ") ||
        "Sandbox patient",
    },
    medications: medicationResources.map(normalizeMedication),
    warnings: [...new Set(warnings)],
  };

  // Limit temporary storage for this local demo.
  if (pendingCodes.size >= 100 || connections.size >= 100) {
    throw new Error("Demo session limit reached. Restart the backend.");
  }

  const code = randomBytes(6).toString("hex").toUpperCase();

  pendingCodes.set(code, {
    snapshot,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  console.log(
    `Epic mobile snapshot prepared: ${snapshot.medications.length} medication order(s).`
  );

  return code;
}

mobileDemoRouter.use((_req, res, next) => {
  removeExpiredItems();
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Exchange a single-use code for access to its saved snapshot.
mobileDemoRouter.post("/pair", (req, res) => {
  const code =
    typeof req.body?.code === "string"
      ? req.body.code.replace(/[\s-]/g, "").toUpperCase()
      : "";

  const pending = pendingCodes.get(code);

  if (!pending) {
    res.status(400).json({
      error: "That code is incorrect, expired, or already used.",
    });
    return;
  }

  pendingCodes.delete(code);

  // This token only accesses the local snapshot. It is not an Epic token.
  const token = randomBytes(32).toString("hex");
  connections.set(token, pending.snapshot);

  res.json({
    token,
    snapshot: pending.snapshot,
  });
});

mobileDemoRouter.get("/medications", (req, res) => {
  const authorization = req.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  const snapshot = connections.get(token);

  if (!snapshot) {
    res.status(401).json({
      error: "Your demo connection expired. Generate a new code on your Mac.",
    });
    return;
  }

  res.json(snapshot);
});