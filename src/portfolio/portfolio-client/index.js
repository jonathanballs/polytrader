import React from 'react';
import { render } from 'react-dom';
import axios from 'axios'

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      portfolioHistories: null
    }

    this.fetchPortfolioHistory()
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

  fetchPortfolioHistory() {
    var portfolioHistoryPromise = axios.get('/portfolio/api/portfolio-history/')

    portfolioHistoryPromise.then(portfolioHistories => {
      this.setState({portfolioHistories: portfolioHistories.data})
    })
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

  render() {
    return (
      <div>
        <h1>Your Portfolio - {this.portfolioValueAtTime(new Date)} BTC</h1>
        <div className="row" style={{ height: "20em" }}>
          <div className="col-sm-9">
            <table className="table">
              <thead>
                <tr>
                  <th>Currency</th>
                  <th>Balance</th>
                  <th>Bitcoin Value</th>
                </tr>
              </thead>
              <tbody />
            </table>
          </div>
          <div className="col-sm-3">
            Pie chart goes here
          </div>
        </div>
        <div className="row">
          <div className="col-sm-12">
            <div id="portfolio-value-history"></div>
          </div>
        </div>
        <div className="row">
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
        </div>
      </div>
    );
  }
}

render(<App />, document.getElementById('portfolioApp'));
