# Railway Deployment Guide for HomeAI Backend

## Fixed Issues

### 1. Database Connection
- ✅ Added SSL support for Railway production database
- ✅ Added connection pooling and timeout settings
- ✅ Proper error handling for database connections

### 2. Email Service
- ✅ Fixed SMTP configuration for Railway environment
- ✅ Added connection pooling for email service
- ✅ Proper timeout settings for production

### 3. Error Handling
- ✅ Enhanced logging for Railway production
- ✅ Added environment-specific error details
- ✅ Graceful degradation when email service fails

## Environment Variables Required

Make sure these are set in your Railway service:

### Database Variables
- `DB_HOST`: Your Railway database host
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `DB_PORT`: Database port

### Email Variables
- `SMTP_USER`: Your Gmail email address
- `SMTP_PASS`: Your Gmail app password
- `SMTP_HOST`: smtp.gmail.com (optional)
- `SMTP_PORT`: 587 (optional)
- `SMTP_SERVICE`: gmail (optional)
- `SMTP_FROM_NAME`: HomeAI (optional)

### JWT Variables
- `JWT_SECRET`: Your JWT secret key
- `JWT_EXPIRES_IN`: 1h (optional)

### Other Variables
- `NODE_ENV`: production (set automatically by Railway)
- `PORT`: Set automatically by Railway
- `RAILWAY_ENVIRONMENT`: Set automatically by Railway

## Deployment Steps

1. **Push your code to GitHub**
2. **Connect your GitHub repository to Railway**
3. **Set all environment variables in Railway dashboard**
4. **Deploy the application**

## Testing the Fix

After deployment, test the registration endpoint:

```bash
curl -X POST https://your-app.railway.app/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com", 
    "password": "password123"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Registration successful. OTP sent to your email for verification."
}
```

## Common Issues and Solutions

### 1. Database Connection Failed
- Check that all DB_* variables are set correctly
- Ensure SSL is enabled (handled automatically)
- Check Railway database logs

### 2. Email Service Failed
- Verify Gmail app password is correct
- Ensure "Less secure apps" is enabled or use App Password
- Check SMTP settings

### 3. 500 Internal Server Error
- Check Railway logs for detailed error messages
- Verify all environment variables are set
- Ensure database tables exist

## Monitoring

- Check Railway logs for real-time error tracking
- Monitor database connection status
- Track email service performance

## Health Check

Your app includes a health check endpoint:
- `GET /health` - Returns server and database status
- `GET /ping` - Simple ping endpoint for Railway monitoring

## Support

If you still encounter issues:
1. Check Railway logs in the dashboard
2. Verify all environment variables are set
3. Test locally with Railway environment variables
4. Check database connectivity
