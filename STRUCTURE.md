# 📁 Project Structure

```
customer-profiling-sales-management/
│
├── 📄 README.md                      # Comprehensive documentation
├── 📄 QUICKSTART.md                  # Quick start guide
├── 📄 PROJECT_SUMMARY.md             # Project overview
├── 📄 CHANGELOG.md                   # Version history
├── 📄 COMPLETE.md                    # Completion checklist
├── 📄 docker-compose.yml             # Docker orchestration
├── 📄 .gitignore                     # Git ignore rules
├── 📄 .env                           # Environment setup notes
├── 🔧 setup.sh                       # Linux/macOS setup script
├── 🔧 setup.bat                      # Windows setup script
│
├── 📂 backend/                       # Node.js Backend
│   ├── 📄 Dockerfile                 # Backend container config
│   ├── 📄 package.json               # Dependencies
│   ├── 📄 tsconfig.json              # TypeScript config
│   ├── 📄 .env.example               # Environment template
│   ├── 📄 .gitignore                 # Backend ignores
│   │
│   └── 📂 src/
│       ├── 📄 server.ts              # Server entry point
│       ├── 📄 app.ts                 # Express app setup
│       │
│       ├── 📂 controllers/           # Request handlers
│       │   ├── 📄 auth.controller.ts
│       │   ├── 📄 customer.controller.ts
│       │   ├── 📄 product.controller.ts
│       │   ├── 📄 sales.controller.ts
│       │   ├── 📄 payment.controller.ts
│       │   ├── 📄 dashboard.controller.ts
│       │   ├── 📄 report.controller.ts
│       │   ├── 📄 document.controller.ts
│       │   └── 📄 user.controller.ts
│       │
│       ├── 📂 routes/                # API routes
│       │   ├── 📄 auth.routes.ts
│       │   ├── 📄 customer.routes.ts
│       │   ├── 📄 product.routes.ts
│       │   ├── 📄 sales.routes.ts
│       │   ├── 📄 payment.routes.ts
│       │   ├── 📄 dashboard.routes.ts
│       │   ├── 📄 report.routes.ts
│       │   ├── 📄 document.routes.ts
│       │   └── 📄 user.routes.ts
│       │
│       ├── 📂 middleware/            # Middleware
│       │   ├── 📄 auth.ts            # Authentication
│       │   └── 📄 errorHandler.ts    # Error handling
│       │
│       ├── 📂 database/              # Database
│       │   ├── 📄 db.ts              # Connection pool
│       │   ├── 📄 schema.sql         # Database schema
│       │   │
│       │   ├── 📂 migrations/
│       │   │   └── 📄 run-migrations.ts
│       │   │
│       │   └── 📂 seeds/
│       │       └── 📄 seed.ts        # Sample data
│       │
│       ├── 📂 config/                # Configuration
│       │   └── 📄 redis.ts           # Redis setup
│       │
│       └── 📂 utils/                 # Utilities
│           ├── 📄 logger.ts          # Winston logger
│           └── 📄 flagCalculator.ts  # Risk calculation
│
└── 📂 frontend/                      # React Frontend
    ├── 📄 Dockerfile                 # Frontend container
    ├── 📄 nginx.conf                 # Nginx config
    ├── 📄 package.json               # Dependencies
    ├── 📄 tsconfig.json              # TypeScript config
    ├── 📄 tsconfig.node.json         # Node TypeScript config
    ├── 📄 vite.config.ts             # Vite config
    ├── 📄 tailwind.config.js         # Tailwind config
    ├── 📄 postcss.config.js          # PostCSS config
    ├── 📄 index.html                 # HTML template
    ├── 📄 .gitignore                 # Frontend ignores
    │
    └── 📂 src/
        ├── 📄 main.tsx               # React entry point
        ├── 📄 App.tsx                # Main app component
        ├── 📄 index.css              # Global styles
        │
        ├── 📂 components/            # Reusable components
        │   └── 📄 Layout.tsx         # Main layout
        │
        ├── 📂 pages/                 # Page components
        │   ├── 📄 Login.tsx          # Login page
        │   ├── 📄 Dashboard.tsx      # Dashboard
        │   ├── 📄 Customers.tsx      # Customer list
        │   ├── 📄 CustomerDetails.tsx # Customer details
        │   ├── 📄 Products.tsx       # Products
        │   ├── 📄 Sales.tsx          # Sales
        │   ├── 📄 Payments.tsx       # Payments
        │   ├── 📄 Reports.tsx        # Reports
        │   └── 📄 Users.tsx          # User management
        │
        ├── 📂 contexts/              # React contexts
        │   └── 📄 AuthContext.tsx    # Auth context
        │
        └── 📂 utils/                 # Utilities
            └── 📄 api.ts             # Axios API client
```

## 📊 File Count Summary

### Backend
- **Controllers**: 9 files
- **Routes**: 9 files
- **Middleware**: 2 files
- **Database**: 3 files
- **Config**: 1 file
- **Utils**: 2 files
- **Total**: ~30 files

### Frontend
- **Pages**: 9 files
- **Components**: 1+ files
- **Contexts**: 1 file
- **Utils**: 1 file
- **Config**: 6 files
- **Total**: ~20 files

### Root
- **Documentation**: 5 files
- **Configuration**: 3 files
- **Scripts**: 2 files
- **Total**: ~10 files

### Grand Total: **60+ files** ✅

---

## 🎯 Key Directories

### `/backend/src/controllers/`
Contains all business logic for:
- Authentication & authorization
- Customer CRUD operations
- Product management
- Sales order processing
- Payment recording
- Dashboard analytics
- Report generation
- Document handling
- User management

### `/backend/src/routes/`
Defines all API endpoints with:
- Route definitions
- Middleware attachment
- Parameter validation
- Role-based access control

### `/frontend/src/pages/`
All UI pages including:
- Login screen
- Interactive dashboard
- Customer management
- Product catalog
- Sales orders
- Payment tracking
- Report generation
- User administration

### `/backend/src/database/`
Database management:
- Connection pooling
- Schema definition (12 tables)
- Migrations runner
- Seed data generator

---

## 🔗 Module Relationships

```
Frontend (React)
    ↓
    ↓ HTTP/REST
    ↓
Backend (Express)
    ↓
    ↓ SQL
    ↓
PostgreSQL Database
    
Backend (Express)
    ↓
    ↓ Cache
    ↓
Redis
```

---

## 📦 Technology Stack by Layer

### Presentation Layer
- React 18+
- TypeScript
- TailwindCSS
- Chart.js
- React Router
- Axios

### Application Layer
- Node.js 20+
- Express.js
- TypeScript
- JWT
- Multer
- Winston

### Data Layer
- PostgreSQL 15
- Redis 7
- Bull Queue

### Infrastructure Layer
- Docker
- Docker Compose
- Nginx

---

## 🎨 Code Organization Principles

### Backend
1. **Separation of Concerns**: Routes → Controllers → Database
2. **Middleware Pattern**: Auth, error handling, validation
3. **Service Layer**: Reusable business logic
4. **Repository Pattern**: Database access abstraction

### Frontend
1. **Component-Based**: Reusable UI components
2. **Context API**: State management
3. **Custom Hooks**: Reusable logic
4. **Atomic Design**: From atoms to organisms

### Database
1. **Normalization**: 3NF compliance
2. **Relationships**: Foreign keys and constraints
3. **Indexes**: Performance optimization
4. **Triggers**: Auto-update timestamps

---

This structure provides:
✅ Clear separation of concerns
✅ Easy to navigate and maintain
✅ Scalable architecture
✅ Production-ready organization
✅ Developer-friendly layout
