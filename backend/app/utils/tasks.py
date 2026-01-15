"""
Background Tasks and Scheduled Jobs
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


async def release_expired_reservations_task():
    """
    Release expired stock reservations.
    
    This should be called periodically (e.g., every minute)
    to clean up reservations that weren't confirmed.
    
    Note: This uses a sync session since the app uses sync SQLAlchemy.
    For production, consider using Celery or APScheduler.
    """
    from app.database import SessionLocal
    from app.models.order import StockReservation, Order
    from app.models.product import Inventory
    from app.models.enums import OrderStatus
    from sqlalchemy import select, and_
    from decimal import Decimal
    
    db = SessionLocal()
    count = 0
    
    try:
        now = datetime.utcnow()
        
        # Find expired active reservations
        result = db.execute(
            select(StockReservation).where(
                and_(
                    StockReservation.status == "active",
                    StockReservation.expires_at < now,
                )
            )
        )
        expired_reservations = list(result.scalars().all())
        
        for reservation in expired_reservations:
            # Get inventory
            inv_result = db.execute(
                select(Inventory).where(Inventory.product_id == reservation.product_id)
            )
            inventory = inv_result.scalar_one_or_none()
            
            if inventory:
                # Release reserved quantity
                inventory.reserved_quantity -= reservation.reserved_quantity
                if inventory.reserved_quantity < 0:
                    inventory.reserved_quantity = Decimal("0")
            
            # Update reservation status
            reservation.status = "released"
            reservation.released_at = now
            
            # Cancel associated order
            order_result = db.execute(
                select(Order).where(Order.id == reservation.order_id)
            )
            order = order_result.scalar_one_or_none()
            
            if order and order.order_status == OrderStatus.PENDING:
                order.order_status = OrderStatus.CANCELLED
                order.cancelled_at = now
                order.cancellation_reason = "Payment timeout"
            
            count += 1
        
        if count > 0:
            db.commit()
            logger.info(f"Released {count} expired stock reservations")
        
        return count
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error releasing expired reservations: {e}")
        raise
    finally:
        db.close()


async def run_reservation_cleanup_loop(interval_seconds: int = 60):
    """
    Run the reservation cleanup in a continuous loop.
    
    This can be started as a background task when the app starts.
    """
    logger.info(f"Starting reservation cleanup loop (interval: {interval_seconds}s)")
    
    while True:
        try:
            await release_expired_reservations_task()
        except Exception as e:
            logger.error(f"Reservation cleanup error: {e}")
        
        await asyncio.sleep(interval_seconds)


async def auto_cancel_placed_orders_task():
    """
    Auto-cancel PLACED orders that haven't been accepted within 15 minutes.
    
    This should be called periodically (e.g., every 5 minutes)
    to cancel orders that vendors haven't accepted.
    """
    from app.database import SessionLocal
    from app.services.order_service import OrderService
    
    db = SessionLocal()
    
    try:
        service = OrderService(db)
        cancelled_count = service.auto_cancel_placed_orders(timeout_minutes=15)
        
        if cancelled_count > 0:
            logger.info(f"Auto-cancelled {cancelled_count} PLACED orders")
    except Exception as e:
        logger.error(f"Error in auto-cancel placed orders task: {str(e)}")
    finally:
        db.close()


async def run_auto_cancel_loop(interval_seconds: int = 300):
    """
    Run the auto-cancel placed orders task in a continuous loop.
    
    Runs every 5 minutes (300 seconds) to check for orders to auto-cancel.
    """
    logger.info(f"Starting auto-cancel placed orders loop (interval: {interval_seconds}s)")
    
    while True:
        try:
            await auto_cancel_placed_orders_task()
        except Exception as e:
            logger.error(f"Error in auto-cancel placed orders loop: {str(e)}")
        
        await asyncio.sleep(interval_seconds)


# Simple in-memory task runner for development
# In production, use Celery, APScheduler, or similar
class TaskRunner:
    """Simple background task runner."""
    
    def __init__(self):
        self._tasks = []
        self._running = False
    
    async def start(self):
        """Start background tasks."""
        if self._running:
            return
        
        self._running = True
        logger.info("Starting background task runner")
        
        # Start reservation cleanup (every 60 seconds)
        task1 = asyncio.create_task(
            run_reservation_cleanup_loop(interval_seconds=60)
        )
        self._tasks.append(task1)
        
        # Start auto-cancel placed orders (every 5 minutes = 300 seconds)
        task2 = asyncio.create_task(
            run_auto_cancel_loop(interval_seconds=300)
        )
        self._tasks.append(task2)
    
    async def stop(self):
        """Stop all background tasks."""
        self._running = False
        logger.info("Stopping background task runner")
        
        for task in self._tasks:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        self._tasks.clear()


# Global task runner instance
task_runner = TaskRunner()
