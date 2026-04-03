import sys

from loguru import logger

from src.config import settings


def configure_logger():
    logger.remove()
    logger.add(sys.stderr, level="DEBUG" if settings.debug else "INFO")