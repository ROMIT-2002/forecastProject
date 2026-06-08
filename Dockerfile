FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend directory
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend app code and static client assets
COPY backend/app ./app

EXPOSE 8000

ENV DATABASE_URL=sqlite:///./forecastiq.db
ENV FRONTEND_URL=http://localhost:3000

# Execute FastAPI module
CMD ["python", "-m", "app.main"]
