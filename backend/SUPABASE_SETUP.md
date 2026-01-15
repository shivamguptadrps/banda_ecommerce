# Supabase Setup Guide

This guide will help you set up Supabase as your PostgreSQL database for the Banda E-Commerce backend.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in the project details:
   - **Name**: banda-ecommerce (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the region closest to you
5. Click "Create new project"
6. Wait for the project to be created (takes 1-2 minutes)

## Step 2: Get Your Database Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string** section
3. Select **URI** tab
4. Copy the connection string. It will look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

## Step 3: Configure Your Backend

1. Create a `.env` file in the `backend` directory (if it doesn't exist)
2. Add your Supabase connection string:

```env
# Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Application
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-here-change-in-production

# Redis (optional - can use Supabase's built-in features or keep local Redis)
REDIS_URL=redis://localhost:6379/0

# Other services (configure as needed)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

**Important**: Replace `[YOUR-PASSWORD]` with the database password you set when creating the project, and `[PROJECT-REF]` with your actual project reference.

## Step 4: Run Database Migrations

After setting up your `.env` file, run the Alembic migrations to create all the database tables:

```bash
cd backend
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run migrations
alembic upgrade head
```

## Step 5: Verify Connection

Test the database connection by starting the backend:

```bash
# Start the backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

If everything is configured correctly, you should see:
- ✅ Database connection successful
- The API server running on http://localhost:8000

## Additional Supabase Features

Supabase provides many additional features you can use:

- **Authentication**: Built-in user authentication
- **Storage**: File storage for images/products
- **Realtime**: Real-time subscriptions
- **Edge Functions**: Serverless functions

## Troubleshooting

### Connection Issues

If you get connection errors:
1. Check that your `.env` file has the correct `DATABASE_URL`
2. Verify your Supabase project is active (not paused)
3. Check your firewall/network settings
4. Make sure you're using the correct password

### SSL Connection

If you need SSL (recommended for production), add `?sslmode=require` to your connection string:
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

### Pool Connection Issues

If you encounter connection pool errors, you can adjust the pool settings in `app/database.py` or add connection pool parameters to your connection string.

## Next Steps

After setting up Supabase:
1. Run migrations to create tables
2. Create an admin user (use the script in `scripts/create_admin.py`)
3. Start developing!
