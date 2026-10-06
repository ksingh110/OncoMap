"""Render start command: gunicorn -c gunicorn.conf.py app:app"""
import os
import resource

bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"
workers = 1
worker_class = "gthread"
threads = 2
timeout = 90
accesslog = None
errorlog = "-"
loglevel = "warning"
capture_output = False
# This is Gunicorn's heartbeat file, not upload storage. Render runs on Linux.
worker_tmp_dir = "/dev/shm"


def on_starting(server):
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
