#!/bin/bash

# Customer Profiling & Sales Management System
# Setup Script

echo "🚀 Setting up Customer Profiling & Sales Management System..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backend/uploads
mkdir -p backend/logs

# Copy environment file if not exists
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend .env file..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please update backend/.env with your configuration"
fi

# Build and start services
echo "🐳 Building and starting Docker containers..."
docker-compose up -d --build

echo "⏳ Waiting for services to start..."
sleep 10

# Check if backend is healthy
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not responding"
    echo "Check logs with: docker-compose logs backend"
fi

# Check if frontend is accessible
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend is not responding"
    echo "Check logs with: docker-compose logs frontend"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "🔐 Login credentials:"
echo "   Username: admin"
echo "   Password: adminpass"
echo ""
echo "📚 Documentation:"
echo "   README.md - Full documentation"
echo "   QUICKSTART.md - Quick start guide"
echo "   PROJECT_SUMMARY.md - Project overview"
echo ""
echo "🛠️  Useful commands:"
echo "   docker-compose logs -f          # View logs"
echo "   docker-compose ps               # Check status"
echo "   docker-compose restart          # Restart services"
echo "   docker-compose down             # Stop services"
echo "   docker-compose down -v          # Stop and remove volumes"
echo ""
