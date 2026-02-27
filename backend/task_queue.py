"""Async task queue for background email sending"""
import queue
import threading
import time
from datetime import datetime
from email_service import EmailService

# Global task queue
_task_queue = queue.Queue()
_worker_thread = None
_running = False

email_service = EmailService()

class EmailTask:
    """Represents an email task to be sent"""
    def __init__(self, task_type, recipient_email=None, recipient_name=None,
                 signing_link=None, doc_name=None, sender_email=None,
                 all_emails=None, pdf_data=None):
        self.task_type = task_type  # 'signing_link' or 'final_pdf'
        self.recipient_email = recipient_email
        self.recipient_name = recipient_name
        self.signing_link = signing_link
        self.doc_name = doc_name
        self.sender_email = sender_email
        self.all_emails = all_emails  # For final_pdf
        self.pdf_data = pdf_data
        self.created_at = datetime.now()
        self.retries = 0
        self.max_retries = 3

def process_email_task(task):
    """Process a single email task with retry logic"""
    try:
        if task.task_type == 'signing_link':
            result = email_service.send_signing_link(
                task.recipient_email,
                task.recipient_name,
                task.signing_link,
                task.doc_name,
                task.sender_email
            )
        elif task.task_type == 'final_pdf':
            result = email_service.send_final_pdf(
                task.all_emails,
                task.doc_name,
                task.pdf_data,
                task.sender_email
            )
        else:
            print(f"⚠️  Unknown task type: {task.task_type}")
            return

        if result.get('success'):
            print(f"✅ Email sent: {task.task_type} to {task.recipient_email or 'multiple'}")
        else:
            raise Exception(f"Email service error: {result.get('error')}")

    except Exception as e:
        print(f"❌ Email task failed: {e}")
        if task.retries < task.max_retries:
            task.retries += 1
            print(f"   Retrying ({task.retries}/{task.max_retries})...")
            # Re-queue the task
            _task_queue.put(task)
        else:
            print(f"   Max retries reached for {task.task_type}")

def worker_thread_func():
    """Background worker thread that processes email tasks"""
    print("📧 Email worker thread started")
    while _running:
        try:
            # Get task with timeout to allow graceful shutdown
            task = _task_queue.get(timeout=1)
            if task is None:  # Shutdown signal
                break
            process_email_task(task)
        except queue.Empty:
            continue
        except Exception as e:
            print(f"❌ Worker thread error: {e}")

def start():
    """Start the background email worker thread"""
    global _worker_thread, _running
    if _running:
        print("⚠️  Task queue already running")
        return

    _running = True
    _worker_thread = threading.Thread(target=worker_thread_func, daemon=True)
    _worker_thread.start()
    print("✅ Task queue started")

def stop():
    """Stop the background email worker thread gracefully"""
    global _running
    if not _running:
        return

    print("Stopping task queue...")
    _running = False
    _task_queue.put(None)  # Shutdown signal
    if _worker_thread:
        _worker_thread.join(timeout=5)
    print("Task queue stopped")

def enqueue_signing_link(recipient_email, recipient_name, signing_link, doc_name, sender_email):
    """Queue a signing link email to be sent asynchronously"""
    task = EmailTask(
        task_type='signing_link',
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        signing_link=signing_link,
        doc_name=doc_name,
        sender_email=sender_email
    )
    _task_queue.put(task)
    print(f"📨 Queued signing link email for {recipient_email}")

def enqueue_final_pdf(all_emails, doc_name, pdf_data, sender_email):
    """Queue a final PDF email to be sent asynchronously"""
    task = EmailTask(
        task_type='final_pdf',
        all_emails=all_emails,
        doc_name=doc_name,
        pdf_data=pdf_data,
        sender_email=sender_email
    )
    _task_queue.put(task)
    print(f"📨 Queued final PDF email for {len(all_emails)} recipients")

def get_queue_size():
    """Get current queue size"""
    return _task_queue.qsize()
