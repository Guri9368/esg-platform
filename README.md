# ESG Data Ingestion & Review Platform

A production-grade multi-tenant platform for ingesting, normalizing, and auditing ESG emissions data from heterogeneous enterprise sources (SAP, utility portals, corporate travel systems).

---

## What This Is

Companies upload operational data from three enterprise sources:

- **SAP Fuel & Procurement** — messy CSV exports with German column names, mixed units, inconsistent date formats (Scope 1)
- **Utility Electricity** — billing CSVs with overlapping periods and abnormal spike detection (Scope 2)
- **Corporate Travel** — JSON API ingestion (Concur/Navan style) with airport distance inference (Scope 3)

The system normalizes all of it, calculates CO₂e using DEFRA 2023 emission factors, flags suspicious rows automatically, and routes everything through an analyst review workflow with a full immutable audit trail.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| UI Components | ShadCN UI, TanStack Table, Lucide Icons |
| State / Data | React Query, Zustand |
| Backend | Django 5, Django REST Framework |
| Auth | JWT via SimpleJWT |
| Database | PostgreSQL (Neon) |
| Deployment | Vercel (frontend), Railway (backend) |

---

## Project Structure
esg-platform/
├── backend/
│ ├── config/
│ │ ├── settings/
│ │ │ ├── base.py
│ │ │ ├── development.py
│ │ │ └── production.py
│ │ ├── urls.py
│ │ └── wsgi.py
│ ├── apps/
│ │ ├── tenants/ # Multi-tenancy root
│ │ ├── accounts/ # JWT auth, roles
│ │ ├── ingestion/ # Upload, parse, normalize
│ │ │ ├── parsers/ # SAP, utility, travel parsers
│ │ │ └── normalizers/ # Units, dates, emissions
│ │ ├── review/ # Analyst review workflow
│ │ └── audit/ # Immutable audit trail
│ ├── manage.py
│ └── requirements.txt
│
└── frontend/
└── src/
├── app/
│ ├── (auth)/login/
│ └── (dashboard)/
│ ├── page.tsx # Dashboard
│ ├── upload/ # Upload center
│ ├── review/ # Review queue + detail
│ └── audit/[id]/ # Audit timeline
├── components/
│ ├── audit/
│ ├── layout/
│ ├── review/
│ └── upload/
├── hooks/
├── lib/
├── store/
└── types/

text


---

## Local Development Setup

### Prerequisites

```bash
node --version    # 18.17 or higher
python --version  # 3.11 or higher
1. Clone and Enter the Project
Bash

git clone <your-repo-url>
cd esg-platform
2. Database — Neon PostgreSQL
Go to https://neon.tech and create a free account
Create a new project → name it esg-platform
Create a database → name it esg_platform
From the dashboard, copy your connection details:
Host
Database
User
Password
3. Backend Setup
Bash

cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
Create backend/.env:

env

SECRET_KEY=your-secret-key-here-make-it-long-and-random
DEBUG=True
DB_NAME=esg_platform
DB_USER=your_neon_user
DB_PASSWORD=your_neon_password
DB_HOST=your_neon_host.neon.tech
DB_PORT=5432
DB_SSLMODE=require
DJANGO_SETTINGS_MODULE=config.settings.development
Run migrations and seed data:

Bash

python manage.py makemigrations tenants
python manage.py makemigrations accounts
python manage.py makemigrations ingestion
python manage.py makemigrations review
python manage.py makemigrations audit
python manage.py migrate

python manage.py seed_emission_factors

python manage.py createsuperuser
# Username: admin
# Password: admin123
Create a tenant and link the admin user:

Bash

python manage.py shell
Python

from apps.tenants.models import Tenant
from apps.accounts.models import User

tenant = Tenant.objects.create(name="Acme Corp", slug="acme-corp")

admin = User.objects.get(username="admin")
admin.tenant = tenant
admin.role = "admin"
admin.save()

analyst = User.objects.create_user(
    username="analyst1",
    password="analyst123",
    email="analyst@acme.com",
    role="analyst",
    tenant=tenant,
)

print("Setup complete.")
exit()
Start the backend:

Bash

python manage.py runserver
# Runs at http://localhost:8000
4. Frontend Setup
Open a second terminal:

Bash

cd frontend

npm install

# Install all required packages
npm install @tanstack/react-query @tanstack/react-table
npm install zustand axios date-fns
npm install lucide-react
npm install clsx tailwind-merge class-variance-authority
npm install @radix-ui/react-dialog @radix-ui/react-select \
  @radix-ui/react-tooltip @radix-ui/react-dropdown-menu
Create frontend/.env.local:

env

NEXT_PUBLIC_API_URL=http://localhost:8000/api
Start the frontend:

Bash

npm run dev
# Runs at http://localhost:3000
5. Login
Open http://localhost:3000

Username	Password	Role
admin	admin123	Admin
analyst1	analyst123	Analyst
Testing the Platform
Upload SAP Data
Save this as test_sap.csv and upload it via the Upload Center:

csv

Werk,Kraftstoffart,Menge,Einheit,Lieferant,Rechnungsdatum,Kostenstelle
P001,Diesel,1500,L,Shell Deutschland,15.01.2024,CC-001
P002,Benzin,890,Liters,BP Supply,2024-01-22,CC-002
P003,Erdgas,2200,m3,E.ON Gas,03.02.2024,CC-001
N/A,Kerosin,450,L,Lufthansa Technik,28.02.2024,CC-002
P002,Natural Gas,1800,l,British Gas,31.03.2024,CC-001
UNKNOWN,Diesel,950,ltr,Unknown Vendor,,CC-002
Upload Utility Data
Save this as test_utility.csv:

csv

meter_id,billing_start,billing_end,kwh_usage,tariff_type,facility
MTR-001,2024-01-01,2024-01-31,45200,Business Standard,London HQ
MTR-002,01/15/2024,02/14/2024,28700,Economy 7,Manchester Office
MTR-003,15.01.2024,14.02.2024,680000,Industrial,Birmingham Plant
MTR-004,,2024-03-31,19400,Business Standard,Edinburgh Office
Import Travel Data
Bash

# Get your token first
curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  | python -m json.tool
Bash

# Use the access token from above
curl -X POST http://localhost:8000/api/travel/import/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '[
    {
      "employee_name": "Sarah Chen",
      "origin_airport": "LHR",
      "destination_airport": "JFK",
      "travel_mode": "flight",
      "hotel_nights": 3,
      "taxi_distance": null
    },
    {
      "employee_name": "Marcus Webb",
      "origin_airport": "LHR",
      "destination_airport": "CDG",
      "travel_mode": "flight",
      "hotel_nights": 1,
      "taxi_distance": null
    },
    {
      "employee_name": "Priya Sharma",
      "origin_airport": null,
      "destination_airport": null,
      "travel_mode": "taxi",
      "hotel_nights": 0,
      "taxi_distance": 45.2
    }
  ]'
PowerShell version:

PowerShell

$login = Invoke-RestMethod `
  -Uri "http://localhost:8000/api/auth/login/" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"username": "admin", "password": "admin123"}'

$token = $login.access

$body = '[
  {"employee_name": "Sarah Chen", "origin_airport": "LHR", "destination_airport": "JFK", "travel_mode": "flight", "hotel_nights": 3, "taxi_distance": null},
  {"employee_name": "Marcus Webb", "origin_airport": "LHR", "destination_airport": "CDG", "travel_mode": "flight", "hotel_nights": 1, "taxi_distance": null},
  {"employee_name": "Priya Sharma", "origin_airport": null, "destination_airport": null, "travel_mode": "taxi", "hotel_nights": 0, "taxi_distance": 45.2}
]'

Invoke-RestMethod `
  -Uri "http://localhost:8000/api/travel/import/" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{Authorization = "Bearer $token"} `
  -Body $body
API Reference
Authentication
Method	Endpoint	Description
POST	/api/auth/login/	Get access + refresh tokens
POST	/api/auth/refresh/	Refresh access token
GET	/api/auth/me/	Current user info
Ingestion
Method	Endpoint	Description
POST	/api/upload/sap/	Upload SAP CSV (multipart)
POST	/api/upload/utility/	Upload utility CSV (multipart)
POST	/api/travel/import/	Import travel records (JSON)
GET	/api/upload/history/	Recent uploads for tenant
Review
Method	Endpoint	Description
GET	/api/review/queue/	Paginated review queue
GET	/api/review/<id>/	Single record detail
PATCH	/api/review/<id>/action/	Approve / reject / edit
POST	/api/review/<id>/lock/	Lock record (admin only)
GET	/api/audit/<id>/	Audit trail for a record
Query Parameters for /api/review/queue/
Param	Values	Description
status	pending, warning, approved, rejected, locked	Filter by status
scope	scope1, scope2, scope3	Filter by emission scope
source_type	sap, utility, travel	Filter by source
search	any string	Search structured data
page	integer	Page number
User Roles
Role	Permissions
Admin	All actions including lock
Analyst	Approve, reject, edit
Viewer	Read only
Data Model Overview
text

Tenant
  └── User (role: admin/analyst/viewer)
  └── DataSource (sap/utility/travel + raw payload)
        └── RawRecord (immutable, one per CSV row)
              └── NormalizedEmissionRecord (status, CO₂e, flags)
                    └── ReviewLog (approve/reject/edit actions)
                    └── AuditLog (field-level change history)

EmissionFactor (DEFRA 2023, category + unit → kg CO₂e)
PlantMapping (plant_code → facility name per tenant)
Record Statuses
Status	Meaning
pending	Ingested, awaiting review
warning	Ingested with automatic flags
approved	Analyst approved
rejected	Analyst rejected with comment
locked	Admin locked for compliance audit
Emission Factors (DEFRA 2023)
Category	Unit	kg CO₂e
Diesel	liter	2.68884
Petrol	liter	2.31380
Natural Gas	liter	0.00202
LPG	liter	1.55540
Heavy Fuel Oil	liter	3.17890
Kerosene	liter	2.53770
Electricity (UK)	kWh	0.20493
Flight	km	0.25500
Taxi	km	0.14862
Car	km	0.17046
Hotel	night	31.00000
Automatic Warning Flags
Flag	Triggered When
missing_plant_code	SAP row has no plant code
unmapped_plant_code	Plant code not in PlantMapping table
unknown_fuel_type	Fuel type cannot be categorized
unknown_unit	Volume unit not recognized
invalid_quantity	Quantity is not a valid number
unparseable_date	Date format not recognized
no_emission_factor	No matching factor in database
missing_meter_id	Utility row has no meter ID
abnormal_high_usage	kWh > 500,000 per billing period
negative_usage	kWh value is negative
unknown_origin_airport	Airport code not in known list
unknown_destination_airport	Airport code not in known list
flight_distance_not_found	Airport pair not in distance table
unknown_travel_mode	Travel mode not recognized
Environment Variables
Backend (backend/.env)
Variable	Required	Description
SECRET_KEY	Yes	Django secret key
DEBUG	Yes	True for dev, False for prod
DB_NAME	Yes	PostgreSQL database name
DB_USER	Yes	PostgreSQL username
DB_PASSWORD	Yes	PostgreSQL password
DB_HOST	Yes	PostgreSQL host
DB_PORT	No	Default: 5432
DB_SSLMODE	No	Default: require
DJANGO_SETTINGS_MODULE	Yes	config.settings.development or production
ALLOWED_HOSTS	Prod only	Comma-separated hostnames
CORS_ALLOWED_ORIGINS	Prod only	Comma-separated frontend URLs
Frontend (frontend/.env.local)
Variable	Required	Description
NEXT_PUBLIC_API_URL	Yes	Backend API base URL
Deployment
Backend → Railway
Push backend/ to a GitHub repository
Create a new Railway project → connect the repo
Set root directory to backend/
Add all production environment variables in Railway dashboard
Railway start command: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2
After first deploy, run via Railway shell:
Bash

python manage.py migrate
python manage.py seed_emission_factors
python manage.py createsuperuser
Frontend → Vercel
Push frontend/ to GitHub
Import project in Vercel
Framework preset: Next.js
Root directory: frontend/
Add environment variable: NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
Deploy
Database → Neon
Create account at https://neon.tech
Create project: esg-platform
Create database: esg_platform
Use connection details in Railway environment variables
Common Issues
ModuleNotFoundError: No module named 'apps'
You are running manage.py from the wrong directory. Always run from inside backend/:

Bash

cd backend
python manage.py runserver
could not connect to server
Neon credentials in .env are incorrect. Double-check host, user, password, and database name. Ensure DB_SSLMODE=require.

relation does not exist
Migrations have not been applied:

Bash

python manage.py migrate
CORS errors in browser
development.py must have:

Python

CORS_ALLOW_ALL_ORIGINS = True
Frontend blank page after login
Check that frontend/.env.local has the correct API URL and restart the dev server after changing it.

date-fns import error
Bash

npm install date-fns@3
Daily Development Workflow
Bash

# Terminal 1 — Backend
cd esg-platform/backend
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
python manage.py runserver

# Terminal 2 — Frontend
cd esg-platform/frontend
npm run dev
Open http://localhost:3000

Running Tests
Bash

# Backend
cd backend
python manage.py test apps.ingestion
python manage.py test apps.review
Design Decisions
Why CSV for SAP and utility?
SAP flat-file exports are the most common real-world data handoff pattern. Utility portals universally offer CSV downloads. This simulates the actual data exchange without requiring SAP system access.

Why synchronous normalization?
ESG uploads are batch-sized (hundreds to a few thousand rows). Normalization is CPU-only (no external calls) and completes in milliseconds per row. Async processing would add operational complexity with no user benefit at this scale.

Why row-level multi-tenancy?
Simpler migrations, one connection pool, one database. Schema-per-tenant becomes worthwhile only when tenants need strict DB-level isolation or have dramatically different query volumes. Row-level is correct for this stage.

Why preserve raw records immutably?
In audit disputes, you need to prove what data you actually received. Normalization is derived — if the logic changes, you can re-normalize from raw without data loss.

Why DEFRA factors?
DEFRA GHG Conversion Factors are publicly available, annually updated, and used by most UK and EU companies for GHG Protocol reporting. They're the industry standard for this type of calculation.

Intentional Omissions
Feature	Reason Not Included
PDF / OCR ingestion	Error-prone, expensive, out of scope for MVP
Celery / async jobs	Not needed at current upload sizes
Real SAP integration	Requires BAPI/RFC access, months of work
ML anomaly detection	Rule-based flagging is more auditable and explainable
Real Concur API	Requires OAuth + company account; transport layer is not the point
WebSocket live updates	ESG review is deliberate, not real-time
Schema-per-tenant	Unnecessary complexity at this scale
License
MIT






