# SIDDHBALI TECHNOLOGIES — Backend Architecture (Django 5 + DRF)

Backend-only design. The existing React + Vite + TanStack Router frontend is untouched and
consumes this API over REST at `/api/v1/*`.

---

## 1. Stack

| Layer | Choice |
| --- | --- |
| Framework | Django 5.x, Django REST Framework 3.15 |
| Auth | `djangorestframework-simplejwt` (access 15 min / refresh 7 d, rotation + blacklist) |
| DB | PostgreSQL 16 (`psycopg[binary]`) |
| Cache / broker | Redis 7 (phase 2) |
| Async jobs | Celery 5 + celery-beat (emails, analytics rollups, resume scanning) |
| Docs | `drf-spectacular` -> OpenAPI 3.1, Swagger UI + Redoc |
| Filtering | `django-filter`, DRF `SearchFilter`, `OrderingFilter` |
| Storage | Local `MEDIA_ROOT` in dev, S3-compatible via `django-storages` in prod |
| Config | `django-environ`, 12-factor `.env` |
| Container | Multi-stage Dockerfile + `docker-compose.yml` (web, db, redis, worker, beat, nginx) |
| Server | Gunicorn (`gthread`) behind Nginx; `whitenoise` for static |

---

## 2. Folder structure

```text
backend/
├── manage.py
├── pyproject.toml
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── docker/
│   ├── entrypoint.sh
│   └── nginx/default.conf
├── config/                        # project package
│   ├── __init__.py                # celery_app export
│   ├── celery.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── urls.py                    # /admin, /api/v1/, /api/schema, /api/docs
│   └── settings/
│       ├── base.py
│       ├── development.py
│       ├── production.py
│       └── test.py
├── core/                          # shared kernel, no business logic
│   ├── models.py                  # UUIDModel, TimeStampedModel, SoftDeleteModel, BaseModel
│   ├── managers.py                # SoftDeleteManager / all_objects
│   ├── permissions.py             # IsAdmin, IsStaffOrReadOnly, IsOwnerOrAdmin, HasRole
│   ├── pagination.py              # DefaultPageNumberPagination (page_size=20, max 100)
│   ├── throttling.py              # BurstRateThrottle, PublicFormThrottle
│   ├── exceptions.py              # custom_exception_handler -> uniform error envelope
│   ├── mixins.py                  # SoftDeleteViewSetMixin, AuditLogMixin
│   ├── validators.py              # file size/type, phone, disposable-email block
│   ├── middleware.py              # RequestIDMiddleware, AuditContextMiddleware
│   ├── email.py                   # send_templated_email(...)
│   └── admin.py                   # BaseModelAdmin (soft-delete aware)
├── apps/
│   ├── accounts/
│   ├── contact/
│   ├── newsletter/
│   ├── services/
│   ├── projects/
│   ├── careers/
│   ├── testimonials/
│   ├── faq/
│   ├── blog/
│   ├── mediafiles/                # app label `mediafiles`, API path /api/v1/media/
│   ├── support/
│   ├── erp/
│   ├── rdp/
│   ├── analytics/
│   └── dashboard/
├── templates/emails/
├── static/
├── media/
└── logs/
```

Every app follows the same internal layout:

```text
apps/<app>/
├── __init__.py
├── apps.py
├── models.py
├── managers.py          (when needed)
├── serializers.py
├── views.py             # ViewSets only — thin
├── services.py          # business logic / orchestration
├── selectors.py         # read queries
├── filters.py
├── permissions.py
├── tasks.py             # Celery
├── signals.py
├── admin.py
├── urls.py
├── migrations/
└── tests/
    ├── test_models.py
    ├── test_api.py
    └── factories.py
```

---

## 3. Shared kernel (`core`)

```python
class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    class Meta: abstract = True

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta: abstract = True

class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name="+")
    objects = SoftDeleteManager()      # filters is_deleted=False
    all_objects = models.Manager()
    def delete(self, using=None, keep_parents=False, hard=False): ...
    class Meta: abstract = True

class BaseModel(UUIDModel, TimeStampedModel, SoftDeleteModel):
    class Meta: abstract = True
```

`AuditLog` (in `core`) captures every write:
`id, actor (FK user, null), action (CREATE|UPDATE|DELETE|LOGIN|...), content_type,
object_id, changes (JSONB diff), ip_address, user_agent, request_id, created_at`.
Populated by post_save/post_delete signals plus `AuditContextMiddleware` (thread-local request).

Uniform error envelope:

```json
{ "success": false,
  "error": { "code": "validation_error", "message": "...", "details": { "email": ["Invalid."] } },
  "request_id": "..." }
```

---

## 4. Database schema

### accounts
- **User** (`AbstractBaseUser` + `PermissionsMixin`, email as `USERNAME_FIELD`):
  `id(uuid) · email(unique) · full_name · phone · avatar · is_active · is_staff ·
  is_email_verified · last_login_ip · created_at/updated_at`
- **Role**: `name(unique) · slug · description` — seeded: `admin`, `manager`, `support_agent`,
  `hr`, `editor`, `client`
- **UserRole**: `user FK · role FK · assigned_by · assigned_at`, `unique(user, role)`.
  Roles are never a column on User — always this join table, always checked server-side.
- **EmailVerificationToken**: `user FK · token_hash · expires_at · used_at`
- **PasswordResetToken**: same shape
- **LoginAttempt**: `email · ip · success · created_at` (lockout + analytics)

### contact
- **ContactInquiry**: `full_name · email · phone · company · subject ·
  inquiry_type (business|partnership|incubation|research|support) · message · source_page ·
  ip_address · status (new|read|responded|archived) · responded_by FK · responded_at` + BaseModel

### newsletter
- **Subscriber**: `email(unique, citext) · full_name · status (pending|active|unsubscribed) ·
  confirm_token · unsubscribe_token(uuid) · source · confirmed_at · unsubscribed_at` + BaseModel
- **Campaign** (later): `subject · body_html · scheduled_at · sent_at · recipients_count`

### services
- **ServiceCategory**: `name · slug(unique) · icon · description · order · is_active`
- **Service**: `category FK · title · slug(unique) · summary · description · icon · hero_image ·
  features(JSONB) · deliverables(JSONB) · order · is_featured · is_active ·
  meta_title · meta_description`

### projects
- **ProjectCategory**: `name · slug · order`
- **Technology**: `name · slug · logo`
- **Project**: `category FK · title · slug · client_name · summary · description · cover_image ·
  live_url · completed_on · is_featured · order · technologies M2M · meta_title · meta_description`
- **ProjectImage**: `project FK · image · caption · order`

### careers
- **Department**: `name · slug`
- **JobOpening**: `department FK · title · slug · location ·
  employment_type (full_time|part_time|contract|internship) · experience_min/max · salary_range ·
  description · responsibilities(JSONB) · requirements(JSONB) · openings_count ·
  status (draft|open|closed) · posted_on · closes_on`
- **Application**: `job FK · full_name · email · phone · resume(FileField pdf/doc, <=5MB) ·
  cover_letter · portfolio_url · linkedin_url · experience_years · current_ctc · expected_ctc ·
  status (received|screening|interview|offered|rejected|hired) · rating(1-5) ·
  reviewed_by FK · notes`, `unique(job, email)`

### testimonials
- **Testimonial**: `client_name · client_role · company · company_logo · avatar · quote ·
  rating(1-5) · project FK(null) · is_featured · order · is_approved`

### faq
- **FAQCategory**: `name · slug · order`
- **FAQ**: `category FK · question · answer · order · is_active · view_count`

### blog
- **BlogCategory**: `name · slug · description`
- **Tag**: `name · slug`
- **Post**: `author FK · category FK · tags M2M · title · slug(unique) · excerpt · content ·
  cover_image · reading_minutes · status (draft|scheduled|published|archived) · published_at ·
  view_count · is_featured · meta_title · meta_description`
- **Comment** (moderated): `post FK · parent FK(self,null) · author FK(null) · name · email ·
  body · is_approved`

### mediafiles
- **MediaAsset**: `file · original_name · mime_type · size_bytes · kind (image|document|video) ·
  width/height · alt_text · folder · uploaded_by FK · checksum(sha256)`

### support
- **TicketCategory**: `name · slug · default_priority · default_assignee FK`
- **Ticket**: `ticket_number (SIDDH-YYYY-NNNNNN via DB sequence) ·
  type (contact|career|enquiry|it_support) · subject · description ·
  status (open|in_progress|waiting_on_user|resolved|closed) ·
  priority (low|normal|high|urgent) · category FK · requester FK(null for guests) ·
  requester_name/email/phone/company · assigned_to FK(null) · due_at · first_response_at ·
  resolved_at · closed_at · satisfaction_rating`
- **TicketComment**: `ticket FK · author FK · body · is_internal · created_at`
- **TicketAttachment**: `ticket FK · comment FK(null) · media FK(MediaAsset)`
- **TicketStatusHistory**: `ticket FK · from_status · to_status · changed_by FK · note · created_at`
- **SLAPolicy** (later): `priority · first_response_minutes · resolution_minutes`

### erp (scaffold, phase 7)
**Company, Branch, Employee, Department, Attendance, LeaveRequest, Product, Inventory, Vendor,
PurchaseOrder, Invoice, InvoiceLine, Payment** — stub models plus a reserved router namespace so
URLs stay stable.

### rdp (scaffold, phase 7)
- **RDPPlan**: `name · vcpu · ram_gb · storage_gb · os · monthly_price · is_active`
- **RDPInstance**: `owner FK · plan FK · hostname · ip_address · region ·
  status (provisioning|running|suspended|terminated) · expires_at`
- **RDPRequest**: `requester · plan FK · duration_months · purpose · status`
- **RDPUsageLog**: `instance FK · cpu_pct · ram_pct · recorded_at`

### analytics
- **PageView**: `path · referrer · session_key · user FK(null) · country · device · ua ·
  ip_hash · duration_ms · created_at` (monthly partitions at scale)
- **Event**: `name · path · session_key · user FK(null) · properties(JSONB)`
- **DailyStat** (Celery rollup): `date(unique) · views · unique_visitors · contacts ·
  applications · tickets_opened · tickets_resolved · subscribers`

### dashboard
No tables — read-only aggregation over other apps via `selectors.py`.

---

## 5. API surface (`/api/v1/`)

All list endpoints support `?page=&page_size=&search=&ordering=` plus app-specific filters.

**auth** — `POST login` (JWT pair) · `POST refresh` · `POST logout` (blacklist) ·
`POST register` · `GET/PATCH me` · `POST change-password` ·
`POST password-reset/request` · `POST password-reset/confirm` ·
`POST email/verify` · `POST email/resend` · `GET roles` · `POST users/{id}/roles` (admin)

**contact** — `POST /` (public, 5/hour/IP) · `GET /` `GET /{id}` `PATCH /{id}` `DELETE /{id}`
(admin, soft delete) · `GET stats/`

**newsletter** — `POST subscribe/` · `GET confirm/{token}/` · `POST unsubscribe/` ·
`GET unsubscribe/{token}/` · `GET /` (admin) · `GET export/` (CSV, admin)

**services** — `GET categories/` `GET categories/{slug}/` `GET /` `GET /{slug}/` `GET featured/`
(public read) · full CRUD for admin/editor

**projects** — `GET /` `GET /{slug}/` `GET categories/` `GET technologies/` `GET featured/` ·
CRUD + `POST {id}/images/` (admin)

**careers** — `GET jobs/` `GET jobs/{slug}/` · `POST jobs/{slug}/apply/` (multipart, throttled) ·
`GET applications/` `GET applications/{id}/` `PATCH applications/{id}/` ·
`GET applications/{id}/resume/` (signed URL, HR/admin)

**testimonials** — `GET /` (approved only) · CRUD + `POST {id}/approve/` (admin)

**faq** — `GET categories/` `GET /` · CRUD (admin)

**blog** — `GET posts/` `GET posts/{slug}/` `GET categories/` `GET tags/` ·
`POST posts/{slug}/comments/` · CRUD + `POST posts/{id}/publish/` (editor/admin)

**media** — `POST upload/` (multipart, auth) · `GET /` · `DELETE /{id}/`

**support** — `POST tickets/` (public, returns ticket_number) ·
`POST tickets/track/` (ticket_number + email, public) · `GET tickets/` (own for clients,
all for agents/admin) · `GET tickets/{id}/` · `PATCH tickets/{id}/` ·
`POST tickets/{id}/assign/` · `POST tickets/{id}/status/` ·
`GET/POST tickets/{id}/comments/` (internal notes hidden from clients) ·
`POST tickets/{id}/attachments/` · `GET tickets/stats/`

**erp** — reserved namespace: `companies/ employees/ attendance/ leaves/ products/ inventory/
vendors/ purchase-orders/ invoices/ payments/` (501 stubs until phase 7)

**rdp** — `GET plans/` · `POST requests/` · `GET instances/` ·
`POST instances/{id}/suspend|resume/` (phase 7)

**analytics** — `POST track/` (public, anonymous, hashed IP) · `GET overview/?from&to` ·
`GET top-pages/` · `GET traffic/` (admin)

**dashboard** — `GET stats/` (counts + period deltas) · `GET recent-activity/` ·
`GET charts/tickets/` `GET charts/traffic/` `GET charts/applications/` (admin)

**meta** — `GET /api/schema/` · `GET /api/docs/` (Swagger) · `GET /api/redoc/` · `GET /healthz/`

---

## 6. Cross-cutting features

- **RBAC** — `HasRole("admin", "support_agent")` permission class reading `UserRole`;
  object-level `IsOwnerOrAdmin`.
- **Throttling** — anon 60/min, user 600/min, public forms 5/hour/IP, login 10/hour/IP,
  password reset 3/hour/email.
- **Validation** — serializer + model validators; uploads checked on extension, MIME sniff and
  size; rich text sanitised with `bleach` before storage.
- **Logging** — JSON logs to stdout plus rotating file, `request_id` correlation, Sentry in prod.
- **Email** — SMTP in prod, console in dev; HTML templates in `templates/emails/`; dispatched via
  Celery once Redis lands, `django.core.mail` inline before that.
- **Versioning** — `URLPathVersioning`, `ALLOWED_VERSIONS = ["v1"]`; v2 ships side-by-side.
- **CORS** — `django-cors-headers`, origins from `.env`.
- **Security (prod)** — HSTS, secure cookies, `SECURE_SSL_REDIRECT`, `X_FRAME_OPTIONS=DENY`,
  `CSRF_TRUSTED_ORIGINS`, secrets only from env, `DEBUG=False`.

### Settings split
`base.py` (shared) -> `development.py` (DEBUG, console email, browsable API) and
`production.py` (Gunicorn, S3, Redis cache, Sentry, strict security headers, WhiteNoise),
selected by `DJANGO_SETTINGS_MODULE`.

### `.env.example`
```
DJANGO_SETTINGS_MODULE=config.settings.development
SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://siddhbali:secret@db:5432/siddhbali
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CORS_ALLOWED_ORIGINS=http://localhost:8080
JWT_ACCESS_MINUTES=15
JWT_REFRESH_DAYS=7
EMAIL_HOST=
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=no-reply@siddhbali.com
AWS_STORAGE_BUCKET_NAME=
SENTRY_DSN=
FRONTEND_URL=http://localhost:8080
```

---

## 7. Roadmap

| Phase | Scope |
| --- | --- |
| 0 — Foundation | settings split, `core` kernel, Docker, Postgres, CI, Swagger, healthcheck |
| 1 — Identity | `accounts`: custom user, JWT, roles, email verification, password reset, audit log |
| 2 — Public site APIs | `contact`, `newsletter`, `faq`, `testimonials`, `services` |
| 3 — Content | `projects`, `blog`, `mediafiles` (S3, image variants) |
| 4 — Operations | `careers` (resume pipeline), `support` (tickets, SLA, comments) |
| 5 — Insight | `analytics` ingestion + rollups, `dashboard` aggregates |
| 6 — Async | Redis cache, Celery worker + beat: emails, rollups, digests, cleanup |
| 7 — Future modules | `erp` and `rdp` behind feature flags |
| 8 — Hardening | load tests, index pass, rate-limit tuning, backups, blue/green deploy |

Definition of done per app: models + migrations, serializers, viewsets, filters, permissions,
admin registration, OpenAPI annotations, >=80% test coverage, seed fixtures.

---

## 8. Note on this workspace

This repository runs the React/TanStack frontend and its existing serverless backend, and cannot
execute Python. The Django codebase generated from this document lives in `backend/` as a
standalone deployable service — nothing under `src/` is touched. When you cut over, point the
frontend at it with a single `VITE_API_BASE_URL`.
