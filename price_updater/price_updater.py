#!/usr/bin/python3
# priceUpdater is part of polytrader. It fetches historic prices from the
# poloniex api and inserts it into a mongodb database. It can be run either
# as a command or as a service to continuously update the datastore.

from datetime import datetime
import os
import sys
import time

import requests
import humanize
from pymongo import MongoClient
import pprint

PRICE_API_URL = "https://poloniex.com/public?" + \
       "command=returnChartData&currencyPair=%s&start=%d&end=%d&period=300"
VOLUME_API_URL = 'https://poloniex.com/public?command=return24hVolume'
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data/")

START_TIME = 1388534400

def get_data(currency_pair, start_time=START_TIME, end_time=9999999999):
    api_url = PRICE_API_URL % (currency_pair, start_time, end_time)
    return requests.get(api_url).json()

def update_backup_file(currency_pair):

    start_time = START_TIME

    backup_file_location = os.path.join(DATA_DIR, "{}.csv".format(currency_pair))
    if os.path.exists(backup_file_location):
        with open(backup_file_location, 'r') as f:
            # Set the start time as 1 second after the last record in
            # the backup file
            start_time = int(f.readlines()[-1].split(',')[0]) + 1

    print("Updating {} cache file from {}...".format(
            currency_pair.ljust(8),
            humanize.naturaltime(datetime.fromtimestamp(start_time))
            ))
    
    data = get_data(currency_pair, start_time)

    # Create the data directory if necessary
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    # Write to the backup file unless no new data is returned
    if data[0]['date'] != 0:
        with open(backup_file_location, 'a') as f:
            for rec in data:
                f.write("{},{}\n".format(rec["date"], rec["weightedAverage"]))

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
        print("Updating cache files")
        raw_pairs = requests.get(VOLUME_API_URL).json()
        pairs = sorted([pair for pair in raw_pairs if pair.startswith('BTC')])

        for pair in pairs:
            update_backup_file(pair)

            time.sleep(2) # Just to be polite
    
    elif sys.argv[1] == 'load_cache':
        client = MongoClient('mongodb://localhost:27017/')
        price_history = client['polytrader']['price_history']

        # TODO read the file backwards until we reach where we are
        for csv_filename in os.listdir(DATA_DIR):
            currency_pair = csv_filename[:-4] # Strip file extension

            print("Filling database from {} cache".format(currency_pair))

            with open(os.path.join(DATA_DIR, csv_filename), 'r') as f:
                for line in f:
                    epoch = int(line.split(',')[0])
                    price = float(line.split(',')[1])

                    if not price_history.find_one({'date': epoch}):
                        price_history.insert({'currency_pair': currency_pair, 'date': epoch, 'price': price})
    
    elif sys.argv[1] == 'start':
        client = MongoClient('mongodb://db:27017/')
        print("Connected to Mongo Database")
        db = client['polytrader']
        collection = db['users']
        for u in collection.find():
            pprint.pprint(u)