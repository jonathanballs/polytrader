#!/usr/bin/python3
# priceUpdater is part of polytrader. It fetches historic prices from exchange
# apis and inserts them into a mongodb database. It can be run either as a one
# off command or as a service to continuously update the datastore.

from datetime import datetime
import dateutil.parser
import os
import sys
import time
import json
import pprint
import subprocess

import requests
import humanize
from pymongo import MongoClient

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data/")
CURRENCIES_META_FILE_PATH = os.path.join(DATA_DIR, 'currencies.json')
MONGO_URL = 'mongodb://db:27017/'

POLONIEX_MARKETS_URL = 'https://poloniex.com/public?command=return24hVolume'
BITTREX_MARKETS_URL = 'https://bittrex.com/api/v2.0/pub/Markets/GetMarketSummaries'

POLONIEX_PRICE_HISTORY_URL = "https://poloniex.com/public?" + \
       "command=returnChartData&currencyPair=BTC_%s&start=%d&end=%d&period=300"
BITTREX_PRICE_HISTORY_URL = 'https://bittrex.com/Api/v2.0/pub/market/GetTicks?marketName=BTC-%s&tickInterval=day&_=1509971318614'

def print_help():
    print("Usage: ./priceUpdater.py COMMAND")
    print("Available Commands: ")
    print("    start                Continuously update db from api")
    print("    update_cache         Updates cache files in data/")
    print("    load_cache           Updates database from cache")
    print("    db_stats             Displays statistics of database prices")
    print("    cache_stats          Displays statistics of cache prices")

if __name__ == '__main__':

    if len(sys.argv) == 1:
        print_help()
        exit()

    if sys.argv[1] == 'update_cache':
        print("Updating cache...")
    
        # Get Poloniex currencies
        poloniex_markets = requests.get(POLONIEX_MARKETS_URL).json()
        poloniex_currencies = sorted([pair[4:] for pair in poloniex_markets if pair.startswith("BTC_")])

        # Get Bittrex currenices (minus poloniex ones)
        bittrex_markets = requests.get(BITTREX_MARKETS_URL).json()
        bittrex_currencies = [market["Market"]["MarketCurrency"] for market in bittrex_markets["result"]]
        bittrex_currencies = sorted(list(set(bittrex_currencies).difference(set(poloniex_currencies))))

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
        for currency in poloniex_currencies:
            start_time = recent_ticks[currency] if currency in recent_ticks else 0
            end_time = int(time.time())
            url = POLONIEX_PRICE_HISTORY_URL % (currency, start_time, end_time)

            print("Updating BTC_{} cache file from {}...".format(
                currency.ljust(4),
                "scratch" if currency not in recent_ticks else humanize.naturaltime(datetime.fromtimestamp(start_time))
                ))
            
            backup_file_location = os.path.join(DATA_DIR, currency + '.csv')
            data = requests.get(url).json()
            if data[0]['date'] != 0:
                with open(backup_file_location, 'a') as f:
                    for rec in data:
                        f.write("{},{:.10f}\n".format(rec["date"], rec["weightedAverage"]))
        
        # Update history from bittrex
        for currency in bittrex_currencies:
            if currency == 'BTC':
                continue

            start_time = recent_ticks[currency] if currency in recent_ticks else 0
            end_time = int(time.time())
            url = BITTREX_PRICE_HISTORY_URL % (currency)

            print("Updating BTC_{} cache file from {}...".format(
                currency.ljust(4),
                "scratch" if currency not in recent_ticks else humanize.naturaltime(datetime.fromtimestamp(start_time))
                ))

            backup_file_location = os.path.join(DATA_DIR, currency + '.csv')
            data = requests.get(url).json()
            with open(backup_file_location, 'a') as f:
                for rec in data["result"]:
                    timestamp = int(dateutil.parser.parse(rec["T"]).strftime('%s'))
                    if timestamp > start_time:
                        f.write("{},{:.10f}\n".format(timestamp, rec["O"]))

    elif sys.argv[1] == 'load_cache':
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
                current_date = datetime.fromtimestamp(0)
                current_record = {}
                price_records = []
                for line in f.readlines():
                    l_sp = line.split(',')
                    l_date = datetime.fromtimestamp(int(l_sp[0]))
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


    elif sys.argv[1] == 'start':
        client = MongoClient(MONGO_URL)
        print("Price updater connected to database...")

    else:
        print("Error couldn't understand arguments")
        print_help()
        exit()
