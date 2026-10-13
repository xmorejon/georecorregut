FROM python:3.12-slim

# Prevent Python from buffering stdout and stderr
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

EXPOSE 8080

CMD ["python", "main.py"]
