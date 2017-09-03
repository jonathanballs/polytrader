FROM python:3.6-slim

WORKDIR /usr/src/app
COPY setup.py ./
RUN pip install -e .

COPY . .

CMD ["python", "./price_updater.py", "start"]
