import express from "express";
import { randomBytes } from "node:crypto";
import { loadVitals } from "./vitals.js";

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

type Provider = {
  id: string;
  name: string | null;
  role: "Prescribing provider";
};

type Snapshot = {
  source: string;
  fetchedAt: string;
  expiresAt: number;
  patient: { id: string; name: string };
  medications: Medication[];
  providers: Provider[];
  warnings: string[];
};

type HumanName = {
  use?: string;
  text?: string;
  given?: string[];
  family?: string;
};

type MedicationResource = {
  resourceType: string;
  id?: string;
  status?: string;
  authoredOn?: string;
  subject?: { reference?: string };
  requester?: { reference?: string };
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

// Epic credentials stay server-side and are never included in the snapshot JSON.
const vitalsConnections = new WeakMap<
    Snapshot,
    { accessToken: string; expiresAt: number | undefined }
>();

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

function formatName(names?: HumanName[]): string | null {
  const name = names?.find((item) => item.use === "official") ?? names?.[0];

  return (
      name?.text?.trim() ||
      [...(name?.given ?? []), name?.family].filter(Boolean).join(" ") ||
      null
  );
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
    instructions: dose?.patientInstruction || dose?.text || "Not provided",
    status: resource.status || "unknown",
    authoredOn: resource.authoredOn || "Not provided",
  };
}

async function loadProviders(
    medications: MedicationResource[],
    headers: Record<string, string>
): Promise<Provider[]> {
  const ids = new Set<string>();

  for (const medication of medications) {
    const match = /^Practitioner\/([A-Za-z0-9.-]{1,64})$/.exec(
        medication.requester?.reference ?? ""
    );
    const id = match?.[1];

    if (id && id !== "." && id !== "..") ids.add(id);
  }

  return Promise.all(
      [...ids].slice(0, 10).map(async (id): Promise<Provider> => {
        const provider: Provider = {
          id,
          name: null,
          role: "Prescribing provider",
        };

        try {
          const response = await fetch(
              `${fhirBase}/Practitioner/${encodeURIComponent(id)}`,
              {
                headers,
                redirect: "error",
                signal: AbortSignal.timeout(3000),
              }
          );

          console.log(`Epic Practitioner lookup: HTTP ${response.status}`);
          if (!response.ok) return provider;

          const resource = await response.json();

          if (resource.resourceType === "Practitioner" && resource.id === id) {
            provider.name = formatName(resource.name);
          }
        } catch {
          console.warn("Epic Practitioner lookup could not be completed.");
        }

        return provider;
      })
  );
}

export async function prepareMobileDemo(connection: {
  accessToken: string;
  patientId: string;
  expiresAt?: number;
}) {
  removeExpiredItems();

  const headers = {
    Authorization: `Bearer ${connection.accessToken}`,
    Accept: "application/fhir+json",
  };

  const medicationUrl = new URL(`${fhirBase}/MedicationRequest`);
  medicationUrl.searchParams.set("patient", connection.patientId);

  const [patientResponse, medicationResponse] = await Promise.all([
    fetch(`${fhirBase}/Patient/${encodeURIComponent(connection.patientId)}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    }),
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

  const entries: { resource?: MedicationResource }[] = bundle.entry ?? [];
  const resources = entries
      .map((entry) => entry.resource)
      .filter((resource): resource is MedicationResource => Boolean(resource));

  const warnings: string[] = [];

  for (const resource of resources) {
    if (resource.resourceType !== "OperationOutcome") continue;

    for (const issue of resource.issue ?? []) {
      if (issue.severity === "error" || issue.severity === "fatal") {
        throw new Error("Epic reported an error retrieving medication data.");
      }

      if (issue.details?.text) warnings.push(issue.details.text);
    }
  }

  if (bundle.link?.some((link: { relation?: string }) => link.relation === "next")) {
    warnings.push("Only the first page of medication orders is included in this demo.");
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

  const providers = await loadProviders(medicationResources, headers);

  const snapshot: Snapshot = {
    source: "Epic sandbox",
    fetchedAt: new Date().toISOString(),
    expiresAt: Date.now() + 30 * 60 * 1000,
    patient: {
      id: connection.patientId,
      name: formatName(patient.name) || "Sandbox patient",
    },
    medications: medicationResources.map(normalizeMedication),
    providers,
    warnings: [...new Set(warnings)],
  };

  if (pendingCodes.size >= 100 || connections.size >= 100) {
    throw new Error("Demo session limit reached. Restart the backend.");
  }

  vitalsConnections.set(snapshot, {
    accessToken: connection.accessToken,
    expiresAt: connection.expiresAt,
  });

  const code = randomBytes(6).toString("hex").toUpperCase();

  pendingCodes.set(code, {
    snapshot,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  console.log(
      `Epic mobile snapshot prepared: ${snapshot.medications.length} medication order(s), ` +
      `${providers.length} linked provider(s), ` +
      `${providers.filter((provider) => provider.name).length} with a name.`
  );

  return code;
}

mobileDemoRouter.use((_req, res, next) => {
  removeExpiredItems();
  res.setHeader("Cache-Control", "no-store");
  next();
});

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

  const token = randomBytes(32).toString("hex");
  connections.set(token, pending.snapshot);
  res.json({ token, snapshot: pending.snapshot });
});

function findSnapshot(authorization?: string) {
  const token = /^Bearer ([a-f0-9]{64})$/.exec(authorization ?? "")?.[1];
  return token ? connections.get(token) : undefined;
}

mobileDemoRouter.get("/medications", (req, res) => {
  const snapshot = findSnapshot(req.get("Authorization"));

  if (!snapshot) {
    res.status(401).json({
      error: "Your Epic connection expired. Connect again in Medications.",
    });
    return;
  }

  res.json(snapshot);
});

mobileDemoRouter.get("/providers", (req, res) => {
  const snapshot = findSnapshot(req.get("Authorization"));

  if (!snapshot) {
    res.status(401).json({
      error: "Your Epic connection expired. Connect again in Medications.",
    });
    return;
  }

  res.json({
    providers: snapshot.providers,
    source: snapshot.source,
    fetchedAt: snapshot.fetchedAt,
  });
});

mobileDemoRouter.get("/vitals", async (req, res) => {
  const snapshot = findSnapshot(req.get("Authorization"));
  const connection = snapshot ? vitalsConnections.get(snapshot) : undefined;

  if (
      !snapshot ||
      !connection ||
      (connection.expiresAt !== undefined && Date.now() >= connection.expiresAt)
  ) {
    res.status(401).json({
      error: "Your Epic connection expired. Connect again in Medications.",
    });
    return;
  }

  const vitals = await loadVitals(fhirBase, snapshot.patient.id, {
    Authorization: `Bearer ${connection.accessToken}`,
    Accept: "application/fhir+json",
  });

  res.json(vitals);
});