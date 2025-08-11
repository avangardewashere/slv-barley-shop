# Deployment Guide - SLV Barley Shop Admin Dashboard

## Production Build Status
✅ Build successful - v1.1.0
✅ All critical errors fixed
✅ MongoDB schema updated
✅ UI redesigned with premium navy/gold/emerald theme

## Prerequisites
- Node.js 18+ installed
- MongoDB database (Atlas or self-hosted)
- Redis server (optional but recommended)
- Cloudinary account for image uploads

## Environment Setup

1. Copy the production environment template:
```bash
cp .env.production.example .env.production
```

2. Fill in all required environment variables in `.env.production`

3. Generate secure secrets:
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate CSRF secret
openssl rand -base64 32
```

## Build and Deployment Options

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
npm run deploy:vercel

# Deploy preview
npm run deploy:preview
```

### Option 2: Self-Hosted (VPS/Docker)

#### Using PM2:
```bash
# Install PM2
npm install -g pm2

# Build the application
npm run build:production

# Start with PM2
pm2 start npm --name "slv-barley-shop" -- run start:prod

# Save PM2 config
pm2 save
pm2 startup
```

#### Using Docker:
```bash
# Build Docker image
docker build -t slv-barley-shop .

# Run container
docker run -d \
  --name slv-barley-shop \
  -p 3000:3000 \
  --env-file .env.production \
  slv-barley-shop
```

### Option 3: Railway/Render
1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. Deploy automatically on push

## Database Setup

### MongoDB Indexes
The application will automatically create required indexes on first run. Ensure your MongoDB user has the necessary permissions.

### Initial Admin User
On first deployment, an admin user will be created using the credentials from environment variables:
- Email: `ADMIN_EMAIL`
- Password: `ADMIN_PASSWORD`

**Important:** Change the admin password immediately after first login!

## Post-Deployment Checklist

- [ ] Verify all environment variables are set correctly
- [ ] Test database connection
- [ ] Verify Cloudinary integration works
- [ ] Check Redis connection (if using)
- [ ] Test admin login
- [ ] Verify all API endpoints respond correctly
- [ ] Check security headers in browser DevTools
- [ ] Monitor application logs for errors
- [ ] Set up monitoring (optional)
- [ ] Configure backup strategy

## Health Check
```bash
# Check if application is running
curl https://your-domain.com/api/health
```

## Monitoring

### Application Logs
```bash
# PM2 logs
pm2 logs slv-barley-shop

# Docker logs
docker logs slv-barley-shop
```

### Performance Monitoring (Optional)
- New Relic: Set `NEW_RELIC_LICENSE_KEY` in environment
- Sentry: Set `SENTRY_DSN` in environment

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **Firewall**: Configure firewall rules for MongoDB and Redis
3. **Rate Limiting**: Configured at 100 requests per minute by default
4. **CORS**: Update CORS settings if needed in `next.config.ts`
5. **CSP Headers**: Configured in `next.config.ts`

## Troubleshooting

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Database Connection Issues
- Verify MongoDB URI is correct
- Check network access settings in MongoDB Atlas
- Ensure IP whitelist includes server IP

### Image Upload Issues
- Verify Cloudinary credentials
- Check upload preset configuration
- Ensure proper CORS settings

## Maintenance

### Update Dependencies
```bash
npm update
npm audit fix
```

### Database Backup
```bash
# MongoDB backup
mongodump --uri="your-mongodb-uri" --out=backup/

# Restore
mongorestore --uri="your-mongodb-uri" backup/
```

## Support

For issues or questions:
1. Check application logs
2. Review error messages in browser console
3. Verify environment variables
4. Check MongoDB and Redis connections

## Version History
- v1.1.0 - Production ready with new schema, fixed errors, premium UI
- v1.0.0 - Initial release

---
Last updated: December 2024