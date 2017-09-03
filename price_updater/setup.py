
#!/usr/bin/env python
# -*- coding: utf-8 -*-

from setuptools import setup

# Where the magic happens:
setup(
    name='polytrader_priceUpdater',
    version='1.0.0',
    description='Updates a mongodb database with historic poloniex price history',
    author='Jonathan Balls',
    author_email='jonathanballs@protonmail.com',
    url='https://github.com/bonniejools/polytrader',
    install_requires=[
        'humanize==0.5.1',
        'pymongo==3.5.1',
        'requests==2.18.4'
    ]
)
