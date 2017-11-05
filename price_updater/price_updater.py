#!/usr/bin/python3
# priceUpdater is part of polytrader. It fetches historic prices from the
# poloniex api and inserts it into a mongodb database. It can be run either
# as a command or as a service to continuously update the datastore.

from datetime import datetime
import os
import sys
import time
import json
import pprint

import requests
import humanize
from pymongo import MongoClient

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data/")
CURRENCIES_META_FILE_PATH = os.path.join(DATA_DIR, 'currencies.json')

TOP_CURRENCIES_API_URL = 'https://api.coinmarketcap.com/v1/ticker/?limit=200'
PRICE_HISTORY_URL = 'https://cryptocoincharts.info/fast/2fh_period.php?pair=%s-btc&market=bittrex&time=alltime&resolution=1h'

MONGO_URL = 'mongodb://db:27017/'

# Returns True or False depending on success
def update_backup_file(currency):

    # TODO: use &time=3d in order to limit stress on server
    data = requests.get(PRICE_HISTORY_URL % currency).json()

    # Data is returned with a,b,c,d key names
    if not data or len(data['a']) == 0:
        return False

    start_time = data['a'][0][0] / 1000

    data = zip(data['a'], data['c'])

    backup_file_location = os.path.join(DATA_DIR, "{}.csv".format(currency))
    if os.path.exists(backup_file_location):
        with open(backup_file_location, 'r') as f:
            # Set the start time as 1 second after the last record in
            # the backup file
            start_time = int(f.readlines()[-1].split(',')[0]) + 1
    
    print("Updating {} cache file from {}...".format(
        currency.ljust(4),
        humanize.naturaltime(datetime.fromtimestamp(start_time))
        ))
    
    # Create the data directory if necessary
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    with open(backup_file_location, 'w') as f:
        for rec in data:
            f.write("{},{:.15f},{}\n".format(int(rec[0][0] / 1000), rec[0][1], rec[1][1]))

    return True

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
        # Fetch a list of all BTC pairs
        raw_pairs = requests.get(TOP_CURRENCIES_API_URL).json()
        currencies_meta = []

        for c in raw_pairs:
            if(update_backup_file(c['symbol'])):
                currencies_meta.append({
                    'symbol': c['symbol'],
                    'name': c['name'],
                    'available_supply': c['available_supply'],
                    'total_supply': c['total_supply']
                })

        with open(DATA_DIR + 'currencies.json', 'w+') as f:
            f.write(json.dumps(currencies_meta, indent=4))
            f.write('\n')
    
    elif sys.argv[1] == 'load_cache':
        client = MongoClient(MONGO_URL)
        price_history = client['polytrader']['price_history']

        with open(CURRENCIES_META_FILE_PATH) as meta_file:
            currencies = json.load(meta_file)
            for currency in currencies:
                currency_pair = 'BTC_' + currency['symbol']

                with open(os.path.join(DATA_DIR, currency['symbol']) + '.csv', 'r') as f:
                    current_date = datetime.fromtimestamp(0)
                    current_record = {}
                    price_records = []
                    for line in f.readlines():
                        l_sp = line.split(',')
                        l_date = datetime.fromtimestamp(int(l_sp[0]))
                        l_price = float(l_sp[1])

                        l_volume = float(l_sp[2]) # TODO: put this in the db

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
                                'period': 3600,
                                'price_history': []
                            }
                            current_date = l_date
                        current_record['price_history'].append(l_price)
                    
                    if len(current_record['price_history']) > 0:
                        current_record['daily_average'] = \
                            float(sum(current_record['price_history'])) \
                            / len(current_record['price_history'])
                        price_records.append(current_record)

                    print("Filling database from {} cache ({} records)".format(
                                currency_pair.ljust(8), len(price_records)))

                    price_history.insert_many(price_records)

    elif sys.argv[1] == 'start':
        client = MongoClient(MONGO_URL)
        print("Connected to Mongo Database")
        db = client['polytrader']
        collection = db['users']
        for u in collection.find():
            pprint.pprint(u)
    
    else:
        print("Error couldn't understand arguments")
        print_help()
        exit()
