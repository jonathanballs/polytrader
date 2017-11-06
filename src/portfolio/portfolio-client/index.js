import React from 'react';
import { render } from 'react-dom';
import axios from 'axios'

class App extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <h1>Your Portfolio - 20BTC</h1>
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
        <div class="row">
          <div class="col-md-12">
            <table class="table">
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
