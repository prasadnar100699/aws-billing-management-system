# Gunicorn configuration for production deployment

import os
import multiprocessing

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Restart workers
max_requests = 1000
max_requests_jitter = 50
preload_app = True

# Logging
accesslog = "/var/log/tej-billing/access.log"
errorlog = "/var/log/tej-billing/error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = "tej-billing"

# Server mechanics
daemon = False
pidfile = "/var/run/tej-billing.pid"
user = "www-data"
group = "www-data"
tmp_upload_dir = None

# SSL (if needed)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"

def when_ready(server):
    server.log.info("Tej IT Solutions Billing System is ready to serve requests")

def worker_int(worker):
    worker.log.info("Worker received INT or QUIT signal")
    
    # Clean up worker processes
    import requests
    worker.log.info("Worker cleanup completed")