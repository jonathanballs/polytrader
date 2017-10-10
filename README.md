# polytrader
A simple website to analyse poloniex trading history

You will need docker and docker-compose installed

    # Start the server
    $ docker-compose up

    # Download the latest historical price information
    # and load it into the database
    $ docker-compose run price_updater load_cache
    $ docker-compose run price_updater update_cache

    # Start watching files for changes
    $ grunt watch

This will build the necessary containers and launch them.
