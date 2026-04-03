from functools import wraps

from loguru import logger


def service(func):
    """Decorator to wrap service functions and handle errors."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            logger.debug(f"--- starting service: {func.__name__}")
            result = func(*args, **kwargs)
            logger.debug(f"--- finished service: {func.__name__}")
            return result
        except AssertionError as exp:
            logger.error(f"Assertion in service-function '{func.__name__}': {exp}. Please fix.")
            raise
        except Exception as exp:
            logger.exception(f"Error caught in service-function '{func.__name__}': {exp}")
            raise
    return wrapper