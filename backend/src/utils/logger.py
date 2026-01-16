import sys

from loguru import logger

def configure_logger():
    logger.remove()
    logger.add(sys.stderr, level="DEBUG")