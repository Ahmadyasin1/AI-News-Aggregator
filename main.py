from app.daily_runner import run_daily_pipeline
import sys
import time
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def main(hours: int = 72, top_n: int = 10):
    return run_daily_pipeline(hours=hours, top_n=top_n)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--serve":
        from apscheduler.schedulers.background import BackgroundScheduler
        
        logger.info("Starting background scheduler for daily pipeline at 8:00 AM...")
        scheduler = BackgroundScheduler()
        
        # Schedule to run every day at 8:00 AM
        scheduler.add_job(
            run_daily_pipeline,
            'cron',
            hour=8,
            minute=0,
            kwargs={'hours': 24, 'top_n': 10},
            id='daily_pipeline_8am'
        )
        scheduler.start()
        
        try:
            while True:
                time.sleep(60)
        except (KeyboardInterrupt, SystemExit):
            scheduler.shutdown()
            logger.info("Scheduler shut down successfully.")
    else:
        hours = 24
        top_n = 10

        if len(sys.argv) > 1:
            hours = int(sys.argv[1])
        if len(sys.argv) > 2:
            top_n = int(sys.argv[2])

        result = main(hours=hours, top_n=top_n)
        sys.exit(0 if result.get("success", False) else 1)
