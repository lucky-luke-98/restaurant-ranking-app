VENV_DIR = .venv
.PHONY: install_requirements init run

PYTHON = $(shell which python3.11)

init:
	@if [ ! -d "$(VENV_DIR)" ]; then \
		echo "Creating virtual environment in $(VENV_DIR)"; \
		$(PYTHON) -m venv $(VENV_DIR); \
		echo "Virtual environment setup complete."; \
	else \
		echo "Virtual environment already exists in $(VENV_DIR)"; \
	fi

install_requirements:
	$(PYTHON) -m pip install --upgrade pip && \
	$(PYTHON) -m pip install -r requirements.txt

run:
	docker-compose up --build