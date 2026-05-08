from dotenv import load_dotenv
import os

load_dotenv()

APP_ENV = os.getenv("APP_ENV", "development")
PORT = int(os.getenv("PORT", "8000"))
MONGODB_URI = os.getenv("MONGODB_URI", "")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_EXPIRES_IN = int(os.getenv("JWT_EXPIRES_IN", "86400"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,https://queryflow-50xb.onrender.com").split(",")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://queryflow-50xb.onrender.com")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/gmail/callback")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GMAIL_TOKEN_ENCRYPTION_KEY = os.getenv("GMAIL_TOKEN_ENCRYPTION_KEY", "")
