# Shinikizua — Hypertension Risk Prediction Platform

A full-stack clinical decision-support system. Nurses collect triage data
at the point of care, a machine learning model estimates hypertension
risk, and doctors review and approve the predictions before they reach
patients.

[![Watch the demo](https://img.youtube.com/vi/6caKVLG5YrM/maxresdefault.jpg)](https://youtu.be/6caKVLG5YrM)

**Stack:** React · Node/Express · Flask · scikit-learn · MySQL · OpenAI

**Built by:** Deogracious Moriasi — 4th year final project, 2025

**Status:** Working prototype. Not clinically validated. Local-only —
the 8 GB model artifact exceeds free-tier hosting without quantization.
[Details ↓](#why-this-isnt-deployed)

> **Not a diagnostic tool.** This system supports clinical decisions.
> Every prediction is reviewed by a licensed clinician before it is
> saved. See [Model & limitations](#model--limitations).

---

## About this project

I built this to explore the intersection of applied ML and clinical
workflows. The goal wasn't a Kaggle notebook — it was to build something
a real clinic could theoretically use end-to-end, with the auth, audit,
and safety considerations that implies.

**What I worked on:**

- Trained the hypertension risk model on NHANES 1988–2018
- Designed the 21-feature engineering pipeline and calibrated the output
- Built the React frontend with three role-specific dashboards
- Wrote the Node API, the Flask prediction service, and the MySQL schema
- Handled auth (JWT + OTP + email activation), PDF export, and the
  OpenAI recommendations integration

**What I'd do differently next time:** validate the model on a non-US
cohort before building the whole application around it. NHANES is a good
training set, but the deployment target here is East Africa, and I
haven't proven the model transfers.

---

## What it does

Three services, three roles, one workflow:

```
Nurse collects triage data  →  Doctor reviews AI prediction  →  Patient sees history
```

1. **Nurse** submits vitals and lifestyle data from a structured form
2. **Flask service** engineers 21 features, runs a calibrated ensemble
   classifier, and asks GPT-4o-mini for lifestyle recommendations
3. **Doctor** reviews the risk score + recommendations, adds clinical
   notes, approves
4. **Patient** sees the assessment in their dashboard, with trends and
   PDF export

| Role | Dashboard | Can do |
|------|-----------|--------|
| Patient | `/patient-dashboard` | View history, trends, download reports |
| Doctor | `/doctordashboard` | Review predictions, approve with notes |
| Nurse | `/nurse-dashboard` | Admit patients, record triage |

---

## Architecture

```
React (5173)  →  Node/Express (8081)  →  MySQL
                        ↓
                  Flask (8000)
                  sklearn + OpenAI
```

The frontend never calls Flask directly. The Node API handles auth,
adds context, and proxies to Flask. This keeps the ML service stateless
and keeps secrets out of the browser.

**Stack**

- **Frontend** — React 19, Vite, Tailwind, Radix primitives, Recharts
- **Node API** — Express, MySQL2, JWT, bcrypt, Nodemailer
- **Flask service** — Flask, scikit-learn, pandas, OpenAI SDK
- **Database** — MySQL 8

---

## Interesting technical decisions

Three choices worth calling out, and why:

**Train/inference parity.** Feature engineering has to be *identical*
between the training notebook and the Flask service, or the model
silently produces wrong predictions — no error, no warning, just numbers
that look plausible but aren't. I extracted the 21 feature transformers
into a single Python function that both the notebook and the API import,
so they physically can't drift apart.

**Three-service architecture.** The frontend never talks to Flask
directly. All prediction requests go through the Node API, which adds
authentication context. This keeps the ML service stateless, keeps
secrets out of the browser, and gives us one place to log and rate-limit
predictions. The cost is one extra network hop per prediction — worth it.

**AI fallback path.** If the OpenAI call fails, predictions still go
through — the service falls back to a static set of recommendations
tiered by risk level. Clinical workflows can't afford to be blocked by
an LLM being down.

**Calibrated probabilities.** A raw `RandomForest.predict_proba` outputs
vote fractions, not true probabilities. I wrapped it in
`CalibratedClassifierCV` with isotonic regression so "62% risk" actually
means 62%. This matters because the risk thresholds (0.40, 0.60) are
meaningful only if the probabilities are.

---

## The model

**Pipeline:** `SimpleImputer(median)` → `RobustScaler` →
`RandomForestClassifier` → `CalibratedClassifierCV(isotonic)`

**Inputs (11 raw fields from triage):**
sex, age, education, income ratio, weight, height, waist circumference,
BMI, salt while cooking, table salt, physical activity

**Features (21 engineered):**
clinical risk scores, lifestyle composite, interaction terms, and
transformations — all computed with formulas identical between training
and inference.

**Output:**

```json
{
  "probability": 0.623,
  "risk_level": "High",
  "binary_prediction": 1,
  "interpretation": "High risk. Recommended to consult healthcare provider.",
  "features_used": 21,
  "recommendations": [
    "Reduce sodium intake by choosing fresh foods over processed options",
    "Engage in moderate physical activity for at least 30 minutes daily"
  ]
}
```

**Risk thresholds**

| Probability | Level | Action |
|-------------|-------|--------|
| < 0.40 | Low | Maintain healthy lifestyle |
| 0.40–0.60 | Moderate | Lifestyle modifications, monitor |
| ≥ 0.60 | High | Consult healthcare provider |

Recommendations are AI-generated. If the OpenAI call fails, the service
falls back to a static set tailored to the risk category — predictions
are never blocked by LLM availability.

### Performance

| Metric | Value |
|--------|-------|
| AUC-ROC | 0.91 (95% CI: 0.909–0.916) |
| Best F1 | 0.81 @ threshold 0.40 |
| Precision on High Risk | 0.92 @ threshold 0.60 |
| Subgroup AUC | 0.90–0.92 across sex and age bands |

Full evaluation report — threshold sweep, SHAP feature importance,
subgroup analysis — is in [`docs/model-report.html`](docs/model-report.html).

### Limitations

- **No diabetes input.** Earlier training runs included it — it was the
  second-most-important feature by permutation importance. Omitting it
  reduces discrimination on diabetic patients. Re-adding is on the
  roadmap.
- **Trained on NHANES (US population survey).** Not yet validated on a
  Kenyan or East African cohort. Local calibration may differ.
- **No external validation.** All metrics come from an 85/15 stratified
  split of the same training cohort. Prospective validation is required
  before clinical deployment.

### Model versioning

Pickled scikit-learn estimators are **not forward compatible** across
major versions. Do not upgrade scikit-learn in the Flask service without
re-saving the models. The training version is pinned in
`backend-flask/requirements.txt`.

---

## Why this isn't deployed

The calibrated ensemble is an 8 GB `joblib` artifact — the pickle
contains the full RandomForest (400–800 trees × 24 features) plus the
isotonic calibration wrapper. That runs fine on a local machine but
rules out every free-tier container host:

| Host | Free-tier RAM | Fits? |
|------|---------------|-------|
| Render | 512 MB | ✗ |
| Railway | 512 MB | ✗ |
| Fly.io | 256 MB shared | ✗ |
| Vercel | Serverless, 1 GB cap | ✗ |
| Hugging Face Spaces | 16 GB, CPU-only | ✓ if we strip the pickle |
| Small VPS (€5/mo) | 1–2 GB | ✗ without `mmap_mode` |

Three ways to deploy it cheaply if I needed to:

1. **Reduce the ensemble size.** Retrain with 100–200 trees instead of
   800. Drops the pickle to ~1–2 GB with minor AUC impact.
2. **Prune the forest.** Many leaves have near-identical decision paths.
   `ccp_alpha`-based pruning typically shrinks sklearn forests 40–60%
   with similar accuracy.
3. **Re-export as ONNX.** ONNX Runtime is ~10× smaller than the pickle
   for tree ensembles and runs 2–5× faster on CPU. Needs a compatibility
   check for `CalibratedClassifierCV`.

I went with a full-size model for the demo because the goal was model
quality, not deployability. If this were headed to production, I'd go
with option 3.

---

## Getting started

**Prerequisites:** Node 20+, Python 3.11+, MySQL 8, OpenAI API key

```bash
# Install
git clone https://github.com/mosweta/Hypertension-Prediction) && cd Hypertension-Prediction
cd frontend
npm install
cd backend
npm install 
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run (three terminals)
cd backend && python hypertension_api.py       # :8000
cd backend && npm start                          # :8081
cd frontend && npm run dev                                           # :5173
```

Configure `.env` in both backends. Templates are in
`backend-node/.env.example` and `backend-flask/.env.example`.

**First run:** register at `http://localhost:5173/register`, activate via
the email link, log in with OTP. Assign roles directly in the DB
(`roleId` 2 = doctor, 3 = nurse, 4 = patient).

---

## API reference

All routes require a JWT cookie unless noted.

**Auth** — `/register`, `/login`, `/verify-otp`, `/resend-otp`,
`/forgot-password-otp`, `/reset-password-otp`, `/logout`, `/me`

**Patients & triage** — `/viewPatients`, `/viewTriageData`,
`/api/triage`, `/inPatient`, `/admit`, `/recordVital`, `/patient/:id`

**Predictions** — `/api/predict`, `/api/save-prediction`,
`/api/patient/predictions`, `/api/patient/details`

**Admin** — `/api/stats`

**Flask (internal only)** — `/health`, `/api/predict`,
`/api/predict-batch`

The Flask service should never be exposed publicly. The Node API is its
only client.

---

## Project structure

```
shinikizua/
├── frontend/          React + Vite
│   └── src/
│       ├── components/ui/       shadcn primitives
│       ├── PatientDashboard.jsx
│       ├── DoctorDashboard.jsx
│       ├── nurseDashboard.jsx
│       ├── test.jsx             triage form
│       ├── PatientPrediction.jsx
│       └── Login.jsx / Register.jsx
├── backend-node/      Express API
│   ├── server.js
│   └── db/schema.sql
├── backend-flask/     Prediction service
│   ├── hypertension_api.py
│   └── models/*.pkl
└── docs/
    └── model-report.html
```

---

## Security

This system handles personal health information. Before any non-dev
deployment:

- [ ] HTTPS end-to-end (cookies are currently `secure: false`)
- [ ] `sameSite: 'Strict'` on the JWT cookie
- [ ] Rate-limit auth endpoints
- [ ] CSRF protection on state-changing routes
- [ ] Move OTP storage to Redis with TTL
- [ ] Encrypt `predictions.doctor_notes` and `recommendations` at rest
- [ ] Audit-log every read of a patient's predictions
- [ ] Review the OpenAI call — patient data is currently sent to a third
      party. Self-host or anonymise before production.

---

## Roadmap

**Now**
- Re-add diabetes to the triage form and retrain
- Replace OpenAI with a local model or rules-based recommender
- Regenerate the model report to match the deployed model
- Unit tests for feature engineering to guarantee train/inference parity
- Rate limiting + CSRF

**Next**
- Validate on a Kenyan patient cohort
- SHAP explanations in the doctor's view
- Admin dashboard for user/role management
- End-to-end integration tests

**Later**
- External prospective validation
- Regulatory review (Kenya MOH digital health guidelines)
- On-premise LLM for recommendations
- HL7 / FHIR integration

### If this were going to production

- **Quantize the model.** Export to ONNX, cut to ~800 MB, deploy on a
  small VPS.
- **Move model loading off the request path.** Warm the model in a
  background thread at startup so the first request isn't a 15-second
  page-in.
- **Replace OpenAI with a local LLM.** Patient data shouldn't leave the
  network. Llama 3.1 8B or Phi-3 for recommendations.
- **Add Redis for OTP storage and rate limiting.**
- **Containerize both services.** Multi-stage Docker build, distroless
  base, health checks.
- **Add observability.** Structured logs to Loki, metrics to Prometheus,
  trace IDs across the Node → Flask boundary.

---

## Acknowledgements

Trained on the NHANES 1988–2018 dataset. Model evaluation follows
TRIPOD-AI reporting standards for prediction model studies.

**License** — MIT. 
