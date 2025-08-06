# SLV Barley Shop - Admin Dashboard v1.0.0

A professional, production-ready admin dashboard for managing an ecommerce platform built with Next.js, TypeScript, MongoDB, and Tailwind CSS.

## 🚀 Features

- **Modern UI**: Clean, professional interface with indigo accent colors complementing the emerald green theme
- **Product Management**: Create, edit, and manage products with variants and inventory
- **Bundle Management**: Create product bundles with discount management
- **Authentication**: Secure admin authentication with JWT tokens
- **API Documentation**: Built-in API documentation for developers
- **Version Control**: Integrated versioning system for tracking releases
- **Error Handling**: Production-ready error boundaries and centralized error handling
- **Security**: Comprehensive security headers and CSRF protection
- **Performance**: Optimized for production with Next.js best practices

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcryptjs
- **Icons**: Lucide React
- **Validation**: Zod with React Hook Form

## 📦 Prerequisites

- Node.js 18+ 
- MongoDB instance (local or cloud)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd slv-barley-shop
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Setup
Copy the production environment template:
```bash
cp .env.production .env.local
```

Edit `.env.local` with your configuration:
```env
# Database
MONGODB_URI=mongodb+srv://username:password@your-cluster.mongodb.net/slv-barley-shop-prod

# JWT Secret (Generate a secure random string)
JWT_SECRET=your-super-secure-jwt-secret-key

# Application URL
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Environment
NODE_ENV=production
```

### 4. Run Development Server
```bash
npm run dev
# or
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🌐 Production Deployment

### Option 1: Vercel (Recommended)

1. **Connect to Vercel**:
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Environment Variables**:
   Add the following environment variables in Vercel dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL`
   - `NODE_ENV=production`

3. **Deploy**:
   ```bash
   vercel --prod
   ```

### Option 2: Docker Deployment

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine AS deps
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production

   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY . .
   COPY --from=deps /app/node_modules ./node_modules
   RUN npm run build

   FROM node:18-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV production
   COPY --from=builder /app/.next ./.next
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/package*.json ./
   COPY --from=deps /app/node_modules ./node_modules

   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and Run**:
   ```bash
   docker build -t slv-barley-shop .
   docker run -p 3000:3000 --env-file .env.local slv-barley-shop
   ```

### Option 3: Traditional Server Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

3. **Set up reverse proxy** (nginx example):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🔧 Configuration

### Security Features
- **CSRF Protection**: Built-in CSRF token validation
- **Security Headers**: Comprehensive HTTP security headers
- **Rate Limiting**: API rate limiting (configurable)
- **Input Validation**: Server-side validation with Zod
- **Error Handling**: Production-safe error messages

### Performance Optimizations
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic code splitting and lazy loading
- **Bundle Analysis**: Optional webpack bundle analyzer
- **Compression**: Gzip compression enabled
- **Caching**: Optimized caching strategies

## 📊 Monitoring & Analytics

### Health Checks
The application includes health check endpoints:
- `GET /api/health` - Application health status
- API responses include version information for tracking

### Logging
- Structured logging for production debugging
- Error tracking with stack traces in development
- Request/response logging (configurable)

## 🔑 Default Admin Account

After deployment, create the first admin account by registering through the application or using the API directly:

```bash
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@yourcompany.com",
    "password": "securepassword123"
  }'
```

## 📱 UI Features

### Color Scheme
- **Primary**: Emerald Green (#059669, #047857)
- **Accent**: Indigo (#4f46e5, #4338ca)
- **Supporting**: Teal, Gray tones for balance
- **Professional**: High contrast, accessibility-focused design

### Responsive Design
- Mobile-first approach
- Collapsible sidebar on smaller screens
- Touch-friendly interface elements
- Optimized for tablets and mobile devices

## 🔄 Version Management

The application uses semantic versioning:
- **Major**: Breaking changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, backward compatible

Current version is displayed in:
- Sidebar header
- API responses
- Error boundaries
- Application metadata

## 📚 API Documentation

Access the built-in API documentation at `/api-docs` (when logged in) for:
- Authentication endpoints
- Product management
- Bundle management
- Response schemas and examples

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Verify MongoDB URI is correct
   - Check network connectivity
   - Ensure IP whitelist includes your server

2. **Authentication Issues**:
   - Verify JWT_SECRET is set and secure
   - Check token expiration settings
   - Clear browser cookies and localStorage

3. **Build Failures**:
   - Run `npm run lint` to check for TypeScript errors
   - Verify all environment variables are set
   - Check for missing dependencies

### Performance Issues

1. **Slow API Responses**:
   - Check database indexes
   - Monitor MongoDB performance
   - Review query efficiency

2. **Large Bundle Size**:
   - Run `ANALYZE=true npm run build` for bundle analysis
   - Consider code splitting optimization
   - Review imported dependencies

## 📄 License

This project is proprietary software for SLV Barley Shop.

## 🤝 Support

For technical support or deployment assistance, please contact the development team.

---

**Version**: v1.0.0  
**Build Date**: $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")  
**Environment**: Production Ready ✅