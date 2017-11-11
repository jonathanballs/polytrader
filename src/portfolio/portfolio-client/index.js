import React from 'react';
import { render } from 'react-dom';
import axios from 'axios'
import * as Big from 'big.js'
import * as ReactHighcharts from 'react-highcharts'
import * as ReactHighstocks from 'react-highcharts/ReactHighstock.src'

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      portfolioHistories: null
    }

    this.fetchPortfolioHistory()
  }

  fetchPortfolioHistory() {
    var portfolioHistoryPromise = axios.get('/portfolio/api/portfolio-history/')

    portfolioHistoryPromise.then(portfolioHistories => {
      this.setState({portfolioHistories: portfolioHistories.data})
    })
  }

  getPortfoliosAtTime(date) {
    if (this.state.portfolioHistories) {
      return this.state.portfolioHistories
      .map(ph => { // Map to their most recent portfolio
        var portfoliosAtTime = ph.filter(p => Date.parse(p.timestamp) < date)
        if (portfoliosAtTime.length)
          return portfoliosAtTime[portfoliosAtTime.length - 1]
      })
      .filter(p => !!p) // Remove empty portfolios
    }
  }

  portfolioValueAtTime(date) {
    if (!this.state.portfolioHistories) {
      return null
    }
    else {
      var value = this.getPortfoliosAtTime(date)
      .map(p => { // Reduce portfolios to their btcValue
        return p.balances.map(b => parseFloat(b.btcValue)).reduce((b, acc) => b+acc)
      })
      .reduce((b, acc) => b+acc)

      return Number(value).toFixed(3)
    }
  }

  mergePortfolios(portfolios) {

    if (portfolios.length == 0) {
      return
    }

    // Create return value
    var p = {
      timestamp: portfolios[0].timestamp
    }

    // Get a list of currency symbols in all portfolios
    var currencies = Array.from(new Set(portfolios
      .map(p => p.balances.map(b => b.currency))
      .reduce((acc, cs) => acc.concat(cs))))

    var balancesList = portfolios.map(p => p.balances)

    p.balances = currencies.map(c => {
      var amount = 0.0
      var btcValue = 0.0

      balancesList.map(bl => {
        return bl.filter(b => b.currency == c)[0]
      })
      .forEach(b => {
        if (b) {
          amount += parseFloat(b.amount)
          btcValue += parseFloat(b.btcValue)
        }
      })

      return {
        currency: c,
        btcValue: Number(btcValue).toFixed(3),
        amount: Number(amount).toFixed(3)
      }
    })
    .filter(b => {
      return Big(b.btcValue).gt(0.001)
    })

    return p
  }

  render() {

    if (!this.state.portfolioHistories) {
      return <div className="row justify-content-center">
      <div className="col-md-1"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" className="lds-rolling">
        <circle cx="50" cy="50" fill="none" ng-attr-stroke="{{config.color}}" ng-attr-stroke-width="{{config.width}}" ng-attr-r="{{config.radius}}" ng-attr-stroke-dasharray="{{config.dasharray}}" stroke="#1d3f72" strokeWidth="5" r="35" strokeDasharray="164.93361431346415 56.97787143782138" transform="rotate(8 50 50)">
          <animateTransform attributeName="transform" type="rotate" calcMode="linear" values="0 50 50;360 50 50" keyTimes="0;1" dur="1.5s" begin="0s" repeatCount="indefinite"></animateTransform>
        </circle>
      </svg></div></div>
    }

    var currentBalances = this.mergePortfolios(this.getPortfoliosAtTime(new Date))
      .balances.map((b, i) => {
        return <tr key={i}>
          <td>{ b.currency }</td>
          <td>{ b.amount }</td>
          <td>{ b.btcValue }</td>
          <td>{ Big(b.btcValue).times(7500.0).toFixed(2) }</td>
          </tr>
      })

    var balancesPieChartConfig = {
      chart: {
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: 'pie'
      },
      title: {
        text: null
      },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
            style: {
              color: 'black'
            }
          }
        }
      },
      series: [{
        data: this.mergePortfolios(this.getPortfoliosAtTime(new Date)).balances.map(b => {
          return {
            name: b.currency,
            y: parseFloat(b.btcValue)
          }
        })
      }],
      credits: false
    }

    // Create value history chart
    var dates = new Set()
    this.state.portfolioHistories.forEach(ph => {
        ph.forEach(p => dates.add(p.timestamp))
    })
    var dates = Array.from(dates).sort()
    var combinedPortfolios = dates.map(d => {
      return this.mergePortfolios(this.getPortfoliosAtTime(new Date(Date.parse(d))))
    }) .filter(p => !!p)
    .map(p => [
      Date.parse(p.timestamp),
      p.balances.reduce((acc, b) => acc += parseFloat(b.btcValue), 0.0)
    ])

    console.log(this.getPortfoliosAtTime(new Date()))

    console.log(combinedPortfolios)

    var portfolioHistoryLineChartConfig = {
      chart: {
        height: 600,
      },
      rangeSelector: {
        selected: 1,
        inputEnabled: $('#container').width() > 480
      },
      title: {
        text: 'Value History',
      },
      series: [{
        name: 'Portfolio Value (BTC)',
        data: combinedPortfolios,
        marker: {
          enabled: false,
          radius: 3
        },
        shadow: true,
        tooltip: {
          valueDecimals: 2
        }
      }],
      credits: false
    }

    return (
      <div>
        <div className="row" style={{ minHeight: "23em" }}>
          <div className="col-sm-9">
            <h1>Your Portfolio - {this.portfolioValueAtTime(new Date)} BTC</h1>
            <br />
            <table className="table">
              <thead>
                <tr>
                  <th>Currency</th>
                  <th>Balance</th>
                  <th>Bitcoin Value</th>
                  <th>USD Value</th>
                </tr>
              </thead>
              <tbody>
                {currentBalances}
              </tbody>
            </table>
          </div>
          <div className="col-sm-3" style={{ height: "20em" }}>
            <ReactHighcharts config={balancesPieChartConfig} />
          </div>
        </div>
        <div className="row">
          <div className="col-sm-12">
            <ReactHighstocks config={portfolioHistoryLineChartConfig} />
          </div>
        </div>
        {/* <div className="row">
          <div className="col-md-12">
            <table className="table">
              <thead>
                <tr>
                  <th>Statistic</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total profit</td>
                  <td>Uncalculated</td>
                </tr>
                <tr>
                  <td>Percentage profit</td>
                  <td>Uncalculated</td>
                </tr>
                <tr>
                  <td>Total fees payed</td>
                  <td>Uncalculated</td>
                </tr>
                <tr>
                  <td>Percentage fees</td>
                  <td>Uncalculated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div> */}
      </div>
    );
  }
}

render(<App />, document.getElementById('portfolioApp'));
