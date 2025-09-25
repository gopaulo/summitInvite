# Summit 25 - Production Deployment Guide

## Quick Start

1. **Copy the configuration template:**
   ```bash
   cp config.example.json config.json
   ```

2. **Edit your configuration:**
   Fill in all required values in `config.json` with your production settings.

3. **Run the initialization script:**
   ```bash
   node scripts/init.cjs
   ```

4. **Start your application:**
   ```bash
   npm start
   ```

## Available Scripts

- `node scripts/init.cjs` - Complete initialization (recommended)
- `node scripts/setup-database.cjs` - Database setup only
- `node scripts/deploy-test.cjs` - Test deployment readiness
- `npm run dev` - Development mode
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:push` - Push database schema changes

## Configuration Required

### Database
- PostgreSQL database URL
- Database credentials

### Security
- Session secret (minimum 32 characters)
- reCAPTCHA site key and secret key

### Email Service
- Brevo API key
- Sender email and name

### Admin Access
- Admin username and password

## Deployment Checklist

✅ **Before Deployment:**
- [ ] PostgreSQL database created and accessible
- [ ] reCAPTCHA keys obtained from Google
- [ ] Brevo account set up with API key
- [ ] Domain and SSL certificate configured
- [ ] config.json filled with production values

✅ **After Deployment:**
- [ ] Test registration flow
- [ ] Test waitlist submission
- [ ] Test admin dashboard access
- [ ] Test email delivery
- [ ] Test reCAPTCHA protection

## Production Environment Variables

The initialization script will create a `.env` file with all required variables:

```
DATABASE_URL=your_database_url
SESSION_SECRET=your_session_secret
RECAPTCHA_SECRET_KEY=your_recaptcha_secret
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
BREVO_API_KEY=your_brevo_api_key
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
NODE_ENV=production
PORT=5000
```

## Security Notes

- Never commit `config.json` or `.env` files to version control
- Use strong, unique passwords for admin access
- Configure proper firewall rules
- Enable HTTPS in production
- Regularly update dependencies

## Troubleshooting

**Installation Issues:**
- If `npm install` fails with dotenv version errors, try: `npm install dotenv@^16.4.0` before running the init script
- For dependency conflicts, clear cache: `rm -rf node_modules package-lock.json && npm install`

**Database Connection Issues:**
- Verify DATABASE_URL format
- Check database server is running
- Ensure user has proper permissions
- For non-Neon PostgreSQL: Ensure pg driver is installed (`npm install pg @types/pg`)

**Build Failures:**
- Check Node.js version compatibility
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

**Email Not Sending:**
- Verify Brevo API key
- Check email templates and sender settings
- Review email logs in admin dashboard