import datetime
import json
import humanize
import os
import requests
import subprocess
import time

from pymongo import MongoClient

currencies = json.load(open('currencies.json'))
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data/")
POLONIEX_PRICE_HISTORY_URL = "https://poloniex.com/public?" + \
       "command=returnChartData&currencyPair=BTC_%s&start=%d&end=%d&period=300"
MONGO_URL = 'mongodb://db:27017/'

def update_cache():

    print("Updating cache...")

    # Create the data directory if necessary
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    # Get last ticks in cache history. Dictionary of currency symbols to unix timestamps
    recent_ticks = dict()
    for f in os.listdir(DATA_DIR):
        path = os.path.join(DATA_DIR, f)
        currency_name = f[:-4]

        if not path.endswith('csv'):
            continue

        last_line = subprocess.check_output(['tail', '-1', path]).decode('utf-8')
        if len(last_line) == 0:
            os.remove(path)
            continue

        recent_ticks[currency_name] = int(last_line.split(',')[0])
    
    # Update cache from poloniex
    for currency in currencies:
        start_time = recent_ticks[currency['symbol']] if currency['symbol'] in recent_ticks else 0
        end_time = int(time.time())
        url = POLONIEX_PRICE_HISTORY_URL % (currency['symbol'], start_time, end_time)

        print("Updating BTC_{} cache file from {}...".format(
            currency['symbol'].ljust(4),
            "scratch" if currency['symbol'] not in recent_ticks else humanize.naturaltime(datetime.datetime.fromtimestamp(start_time))
            ))
        
        backup_file_location = os.path.join(DATA_DIR, currency['symbol'] + '.csv')
        data = requests.get(url).json()
        if data[0]['date'] != 0:
            with open(backup_file_location, 'a') as f:
                for rec in data:
                    f.write("{},{:.10f}\n".format(rec["date"], rec["weightedAverage"]))

def load_cache():
    print("Loading Cache...")
    client = MongoClient(MONGO_URL)
    price_history = client['polytrader']['price_history']

    for f in sorted(os.listdir(DATA_DIR)):
        path = os.path.join(DATA_DIR, f)
        currency_name = f[:-4]
        currency_pair = 'BTC_' + currency_name

        if not path.endswith('csv'):
            continue

        # Delete the old entries
        price_history.delete_many({ 'currency_pair': currency_pair })

        with open(path, 'r') as f:
            current_date = datetime.datetime.fromtimestamp(0)
            current_record = {}
            price_records = []
            for line in f.readlines():
                l_sp = line.split(',')
                l_date = datetime.datetime.fromtimestamp(int(l_sp[0]))
                l_price = float(l_sp[1])

                # Push the old day if necessary and create new record
                if l_date.date() != current_date.date():
                    if current_record:
                        current_record['daily_average'] = \
                            float(sum(current_record['price_history'])) \
                            / len(current_record['price_history'])
                        price_records.append(current_record)

                    current_record = {
                        'date': l_date,
                        'currency_pair': currency_pair,
                        'daily_average': None,
                        'period': 300,
                        'price_history': []
                    }
                    current_date = l_date
                current_record['price_history'].append(l_price)

            print("Filling database from {} cache ({} records)".format(
                        currency_pair.ljust(8), len(price_records)))
            price_history.insert_many(price_records)

