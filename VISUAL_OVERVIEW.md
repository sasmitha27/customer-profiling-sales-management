# 📊 Visual System Overview

## 🎯 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│                    (React + TailwindCSS)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │Dashboard │  │Customers │  │ Products │  │  Sales   │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │Payments  │  │ Reports  │  │Documents │  │  Users   │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP/REST API
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                               │
│                   (Node.js + Express.js)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Authentication  │  Authorization  │  Business Logic  │  Validation │
│                                                                      │
│  ┌──────────────────────────────────────────────────────┐          │
│  │              CONTROLLERS & ROUTES                     │          │
│  │                                                        │          │
│  │  Auth │ Customers │ Products │ Sales │ Payments      │          │
│  │  Dashboard │ Reports │ Documents │ Users             │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                      │
└──────────────────────┬────────────────────┬─────────────────────────┘
                       │                     │
                       ▼                     ▼
        ┌──────────────────────┐  ┌──────────────────────┐
        │   POSTGRESQL DB      │  │    REDIS CACHE       │
        │                      │  │                      │
        │  • Users             │  │  • Session Store     │
        │  • Customers         │  │  • Dashboard Cache   │
        │  • Products          │  │  • Job Queue         │
        │  • Sales             │  │  • Rate Limiting     │
        │  • Invoices          │  │                      │
        │  • Payments          │  └──────────────────────┘
        │  • Documents         │
        │  • Audit Logs        │
        └──────────────────────┘
```

---

## 🔄 Data Flow Examples

### 1. User Login Flow
```
┌──────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│Client│────▶│ Backend │────▶│PostgreSQL│────▶│  Redis   │
│      │     │  /login │     │  users   │     │ session  │
│      │◀────│         │◀────│          │◀────│          │
│      │     │  JWT    │     │  Verify  │     │  Store   │
└──────┘     └─────────┘     └──────────┘     └──────────┘
   │
   └──▶ Store JWT token
   └──▶ Redirect to Dashboard
```

### 2. Create Sale Flow
```
┌──────┐     ┌─────────┐     ┌──────────┐
│Client│────▶│ Backend │────▶│PostgreSQL│
│      │     │ /sales  │     │          │
│      │     │         │     │ BEGIN TX │
│      │     │         │────▶│ 1. Sale  │
│      │     │         │────▶│ 2. Items │
│      │     │         │────▶│ 3. Invoice│
│      │     │         │────▶│ 4. Install│
│      │     │         │────▶│ 5. Update│
│      │     │         │     │ COMMIT   │
│      │◀────│         │◀────│          │
│      │     │ Invoice │     │          │
└──────┘     └─────────┘     └──────────┘
   │
   └──▶ Display Success
   └──▶ Show Invoice Details
```

### 3. Record Payment Flow
```
┌──────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│Client│────▶│ Backend │────▶│PostgreSQL│────▶│Calculate │
│      │     │/payments│     │          │     │Risk Flag │
│      │     │         │     │ 1. Payment│     │          │
│      │     │         │────▶│ 2. Invoice│◀────│ Update   │
│      │     │         │────▶│ 3. Install│     │Customer  │
│      │     │         │────▶│ 4. Audit  │     │          │
│      │◀────│         │◀────│          │     │          │
│      │     │ Success │     │ COMMIT   │     │          │
└──────┘     └─────────┘     └──────────┘     └──────────┘
   │
   └──▶ Clear Dashboard Cache
   └──▶ Update UI
```

---

## 👥 User Role Hierarchy

```
                    ┌─────────┐
                    │  ADMIN  │ ← Full System Access
                    └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                 │
   ┌────▼────┐    ┌─────▼──────┐   ┌─────▼────┐
   │ Sales   │    │ Accountant │   │ Manager  │
   │ Officer │    └────────────┘   └──────────┘
   └─────────┘         │                 │
        │              │                 │
        │              │                 │
   ┌────▼──────────────▼─────────────────▼────┐
   │           Permissions                     │
   │                                           │
   │ Sales Officer:                            │
   │  ✅ Create customers                     │
   │  ✅ Create sales                         │
   │  ✅ Upload documents                     │
   │  ✅ Record payments                      │
   │  ❌ View all financial data              │
   │  ❌ Manage users                         │
   │                                           │
   │ Accountant:                               │
   │  ✅ View all financial data              │
   │  ✅ Generate reports                     │
   │  ✅ Flag late payments                   │
   │  ❌ Create customers                     │
   │  ❌ Manage users                         │
   │                                           │
   │ Manager:                                  │
   │  ✅ View dashboards                      │
   │  ✅ Analyze trends                       │
   │  ✅ Export reports                       │
   │  ❌ Modify data                          │
   │  ❌ Manage users                         │
   │                                           │
   │ Admin:                                    │
   │  ✅ Everything above                     │
   │  ✅ Manage users                         │
   │  ✅ Override flags                       │
   │  ✅ System configuration                 │
   └───────────────────────────────────────────┘
```

---

## 📊 Database Relationships

```
┌──────────┐         ┌───────────┐         ┌──────────┐
│  USERS   │────────▶│ CUSTOMERS │◀────────│GUARANTORS│
└──────────┘         └─────┬─────┘         └──────────┘
  created_by                │                     │
                            │                     │
                   ┌────────┼────────┐            │
                   │        │        │            │
              ┌────▼───┐ ┌──▼───┐ ┌─▼────────┐   │
              │ SALES  │ │EMPLOY│ │DOCUMENTS │◀──┘
              └───┬────┘ └──────┘ └──────────┘
                  │
         ┌────────┼────────┐
         │        │        │
    ┌────▼───┐ ┌─▼──────┐ │
    │INVOICES│ │  ITEMS  │ │
    └───┬────┘ └─────────┘ │
        │                   │
   ┌────┼────┐              │
   │    │    │              │
┌──▼──┐ │ ┌──▼──────────┐  │
│PAYM │ │ │INSTALLMENTS │  │
│ENTS │ │ └─────────────┘  │
└─────┘ │                  │
        │                  │
    ┌───▼────┐        ┌────▼────┐
    │PRODUCTS│◀───────│  AUDIT  │
    └────────┘        │  LOGS   │
                      └─────────┘
```

---

## 🎯 Customer Risk Flag System

```
┌─────────────────────────────────────────────────────┐
│           AUTOMATIC RISK CALCULATION                │
└─────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                 │
   ┌────▼────┐     ┌─────▼──────┐   ┌─────▼─────┐
   │ GREEN   │     │   YELLOW   │   │    RED    │
   │  FLAG   │     │    FLAG    │   │   FLAG    │
   └─────────┘     └────────────┘   └───────────┘
        │                 │                │
        │                 │                │
   ┌────▼────────────────┴────────────────▼────┐
   │              CONDITIONS                    │
   │                                            │
   │ GREEN:                                     │
   │  • No overdue payments                     │
   │  • Good payment history                    │
   │  • Outstanding < 50,000 LKR                │
   │  • Payment on time                         │
   │                                            │
   │ YELLOW:                                    │
   │  • 20-50% overdue ratio                    │
   │  • 30-90 days overdue                      │
   │  • Outstanding 50,000-100,000 LKR          │
   │  • Some missed payments                    │
   │                                            │
   │ RED:                                       │
   │  • >50% overdue ratio                      │
   │  • >90 days overdue                        │
   │  • Outstanding >100,000 LKR                │
   │  • Multiple missed payments                │
   └────────────────────────────────────────────┘
                         │
                    ┌────▼────┐
                    │ ADMIN   │
                    │ CAN     │
                    │OVERRIDE │
                    └─────────┘
```

---

## 📈 Payment Processing Workflow

```
┌─────────────┐
│ CREATE SALE │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ GENERATE INVOICE│
└──────┬──────────┘
       │
       ▼
┌──────────────────────┐
│ PAYMENT TYPE?        │
└──────┬───────────────┘
       │
   ┌───┼────┬────────────┐
   │   │    │            │
   ▼   ▼    ▼            ▼
┌────┐┌───┐┌──────────┐ ┌─────────┐
│CASH││CRD││INSTALLMNT│ │ SYSTEM  │
└──┬─┘└─┬─┘└────┬─────┘ │ CREATES │
   │    │       │       │ SCHEDULE│
   │    │       │       └────┬────┘
   │    │       │            │
   └────┴───────┴────────────┘
                │
                ▼
        ┌───────────────┐
        │ RECORD PAYMENT│
        └───────┬───────┘
                │
        ┌───────┴────────┐
        │                │
        ▼                ▼
┌─────────────┐  ┌──────────────┐
│UPDATE INVOICE│  │ RECALCULATE  │
│  • Paid Amt  │  │ CUSTOMER FLAG│
│  • Remaining │  │              │
│  • Status    │  │  • Overdue % │
│              │  │  • Days Late │
└──────────────┘  │  • Outstanding
                  └──────────────┘
```

---

## 🎨 UI Component Hierarchy

```
┌──────────────────────────────────────────────────┐
│                  APP ROOT                        │
│              (AuthProvider)                      │
└────────────────────┬─────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼─────┐ ┌──▼────┐ ┌────▼──────┐
    │  Login   │ │Layout │ │Protected  │
    │  Page    │ │       │ │  Routes   │
    └──────────┘ └───┬───┘ └───────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼─────┐ ┌───▼──────┐ ┌──▼────────┐
   │ Sidebar  │ │  Header  │ │  Content  │
   │          │ │          │ │           │
   │• Nav     │ │• User    │ │• Dashboard│
   │• Links   │ │• Logout  │ │• Customers│
   │• Icons   │ │          │ │• Products │
   │          │ │          │ │• Sales    │
   └──────────┘ └──────────┘ │• Payments │
                              │• Reports  │
                              └───────────┘
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│               PRODUCTION ENVIRONMENT                │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │          DOCKER HOST                         │  │
│  │                                              │  │
│  │  ┌────────────┐  ┌────────────┐            │  │
│  │  │  Frontend  │  │  Backend   │            │  │
│  │  │   Nginx    │  │  Node.js   │            │  │
│  │  │  Port 3000 │  │  Port 5000 │            │  │
│  │  └──────┬─────┘  └──────┬─────┘            │  │
│  │         │                │                   │  │
│  │         │    ┌───────────┴──────────┐       │  │
│  │         │    │                      │       │  │
│  │         │  ┌─▼──────────┐  ┌────────▼────┐ │  │
│  │         │  │ PostgreSQL │  │    Redis    │ │  │
│  │         │  │  Port 5432 │  │  Port 6379  │ │  │
│  │         │  └────────────┘  └─────────────┘ │  │
│  │         │                                   │  │
│  │  ┌──────▼────────────────────────────────┐ │  │
│  │  │       Docker Network Bridge           │ │  │
│  │  └───────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │          PERSISTENT VOLUMES                  │  │
│  │                                              │  │
│  │  • postgres_data  (Database)                │  │
│  │  • redis_data     (Cache)                   │  │
│  │  • uploads        (Documents)               │  │
│  │  • logs           (Application Logs)        │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Performance Metrics

```
┌─────────────────────────────────────────────┐
│         PERFORMANCE TARGETS                 │
├─────────────────────────────────────────────┤
│                                             │
│  Dashboard Load Time:     < 3 seconds       │
│  API Response Time:       < 500ms           │
│  Database Query Time:     < 100ms           │
│  Report Generation:       < 5 seconds       │
│  File Upload:            < 2 seconds        │
│                                             │
│  Concurrent Users:        100+              │
│  Customers Supported:     10,000+           │
│  Sales per Day:          1,000+             │
│  Reports per Day:        100+               │
│                                             │
└─────────────────────────────────────────────┘
```

---

This visual overview provides a clear understanding of:
✅ System architecture
✅ Data flows
✅ User permissions
✅ Database relationships
✅ Risk calculation logic
✅ Payment workflows
✅ UI structure
✅ Deployment setup
✅ Performance targets

**System Status: Production Ready** ✅
