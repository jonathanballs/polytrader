#!/usr/bin/python3
# priceUpdater is part of polytrader. It fetches historic prices from exchange
# apis and inserts them into a mongodb database. It can be run either as a one
# off command or as a service to continuously update the datastore.

import json
import os
import subprocess
import sys
import time

from datetime import datetime
import dateutil.parser

import cache
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

currencies = json.load(open('currencies.json'))

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
        cache.update_cache()

    elif sys.argv[1] == 'load_cache':
        cache.load_cache()

    elif sys.argv[1] == 'start':
        client = MongoClient(MONGO_URL)
        print("Price updater connected to database...")

    else:
        print("Error couldn't understand arguments")
        print_help()
        exit()

