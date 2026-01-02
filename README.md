# Customer Profiling & Sales Management System

A comprehensive desktop-first web application for managing customers, furniture sales, payments, and credit risk profiling for retail and manufacturing businesses.

## 🎯 Features

### Customer Management
- Complete customer profiling with personal details, employment info, and guarantors
- Risk flag system (Green/Yellow/Red) with automatic calculation
- Document management with encrypted storage
- Customer history tracking

### Sales Management
- Product catalog with inventory tracking
- Sales order creation with multiple payment types (Cash/Credit/Installment)
- Automatic invoice generation
- Installment schedule management

### Payment Tracking
- Payment recording with invoice mapping
- Overdue payment detection and alerts
- Installment tracking
- Payment history and analytics

### Dashboards & Analytics
- Real-time sales dashboard with trends
- Payment analytics with aging reports
- Product performance metrics
- Customer insights and risk distribution

### Reporting
- PDF and Excel export capabilities
- Sales reports
- Payment reports
- Customer reports
- Overdue reports

### Security & Access Control
- Role-based authentication (Admin, Sales Officer, Accountant, Manager)
- JWT-based authentication
- Encrypted document storage
- Comprehensive audit logging

## 🛠️ Tech Stack

### Backend
- **Node.js 20+** with Express.js
- **PostgreSQL** for data storage
- **Redis** for caching and background jobs
- **Bull** for job queues
- **TypeScript** for type safety
- **JWT** for authentication

### Frontend
- **React 18+** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **Chart.js** for data visualization
- **React Router** for navigation
- **Axios** for API communication

### DevOps
- **Docker & Docker Compose** for containerization
- **Nginx** for reverse proxy

## 📋 Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- PostgreSQL 15+ (for local development)
- Redis 7+ (for local development)

## 🚀 Quick Start with Docker

### 1. Clone the repository
```bash
cd customer-profiling-sales-management
```

### 2. Start all services
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Redis on port 6379
- Backend API on port 5000
- Frontend on port 3000

### 3. Access the application
Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

### 4. Login with test credentials
```
Username: admin
Password: adminpass
```

## 💻 Local Development Setup

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration

5. Run database migrations:
```bash
npm run migrate
```

6. Seed the database:
```bash
npm run seed
```

7. Start development server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The frontend will be available at http://localhost:3000

## 📁 Project Structure

```
customer-profiling-sales-management/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth, error handling
│   │   ├── database/         # DB connection, migrations
│   │   ├── config/           # Redis, other configs
│   │   ├── utils/            # Helper functions
│   │   ├── app.ts            # Express app setup
│   │   └── server.ts         # Server entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── contexts/         # React contexts
│   │   ├── utils/            # Helper functions
│   │   ├── App.tsx           # Main app component
│   │   └── main.tsx          # Entry point
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
└── README.md
```

## 📊 Database Schema

### Main Tables
- **users**: System users with role-based access
- **customers**: Customer profiles with risk flags
- **customer_employment**: Employment details
- **guarantors**: Customer guarantors/witnesses
- **documents**: Encrypted document storage
- **products**: Product catalog
- **sales**: Sales orders
- **sales_items**: Sales order line items
- **invoices**: Generated invoices
- **installment_schedule**: Payment schedules
- **payments**: Payment records
- **audit_logs**: System audit trail

## 🔐 User Roles

### Admin
- Full system access
- User management
- Manual risk flag override
- System configuration

### Sales Officer
- Create/edit customers
- Create sales orders
- Upload documents
- Record payments

### Accountant
- View financial data
- Generate reports
- Flag late payments
- Payment tracking

### Manager
- View dashboards
- Analyze trends
- Export reports
- Read-only access

## 📱 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer details
- `PUT /api/customers/:id` - Update customer
- `PATCH /api/customers/:id/flag` - Update risk flag

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product

### Sales
- `GET /api/sales` - List sales
- `POST /api/sales` - Create sale
- `GET /api/sales/:id` - Get sale details

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment
- `GET /api/payments/overdue` - Get overdue payments
- `GET /api/payments/due-today` - Get due today

### Dashboards
- `GET /api/dashboard/sales` - Sales dashboard
- `GET /api/dashboard/payments` - Payment dashboard
- `GET /api/dashboard/products` - Product dashboard
- `GET /api/dashboard/customers` - Customer dashboard

### Reports
- `GET /api/reports/sales?format=pdf|excel` - Sales report
- `GET /api/reports/payments?format=pdf|excel` - Payment report
- `GET /api/reports/customers?format=pdf|excel` - Customer report
- `GET /api/reports/overdue?format=pdf|excel` - Overdue report

## 🎨 UI Screenshots

### Login Page
Clean, modern login with test credentials display

### Dashboard
- Summary cards for key metrics
- Sales trend charts
- Risk distribution
- Top products and customers

### Customer Management
- Searchable customer list
- Risk flag filtering
- Quick access to customer details

### Payment Tracking
- Overdue payment alerts
- Payment recording interface
- Installment tracking

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=customer_profiling_db
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

## 🧪 Testing

### Test Users
The seed script creates the following test users:

| Username | Password | Role |
|----------|----------|------|
| admin | adminpass | Admin |
| sales1 | sales123 | Sales Officer |
| accountant1 | sales123 | Accountant |
| manager1 | sales123 | Manager |

## 📝 Business Logic

### Customer Risk Flag Calculation
Flags are automatically calculated based on:
- **Green**: Good payment history, no overdue payments
- **Yellow**: Some overdue payments (>20% but <50%), or 30-90 days overdue
- **Red**: High overdue ratio (>50%), or >90 days overdue, or outstanding >100,000 LKR

Admin can manually override flags when necessary.

### Installment Processing
- Installments are automatically generated based on duration
- Monthly amounts calculated evenly
- Due dates set monthly from purchase date
- Payments automatically update installment status

## 🚀 Deployment

### Production Checklist
1. Change all default passwords
2. Update JWT_SECRET to a secure random string
3. Configure database backups
4. Set up SSL/TLS certificates
5. Configure firewall rules
6. Enable production logging
7. Set up monitoring and alerts

### Docker Production Deploy
```bash
docker-compose -f docker-compose.yml up -d
```

## 🛡️ Security Features

- JWT-based authentication with token expiry
- Role-based access control (RBAC)
- Encrypted document storage
- SQL injection prevention with parameterized queries
- XSS protection with input sanitization
- Rate limiting on API endpoints
- Comprehensive audit logging
- Secure password hashing with bcrypt

## 📈 Performance Optimizations

- Redis caching for dashboard data
- Database indexing on frequently queried fields
- Pagination on all list endpoints
- Optimized SQL queries with proper joins
- Frontend code splitting
- Image optimization
- Gzip compression

## 🤝 Contributing

This is a complete production-ready system. For modifications:
1. Follow the existing code structure
2. Maintain TypeScript types
3. Write clean, documented code
4. Test all changes thoroughly

## 📄 License

Proprietary - All rights reserved

## 👥 Support

For support and questions, contact the development team.

## 🎉 Acknowledgments

Built with modern best practices for:
- Security
- Performance
- Scalability
- Maintainability
- User experience

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: Production Ready
