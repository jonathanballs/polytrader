import React from 'react';
import {render} from 'react-dom';
import axios from 'axios'

import Account from './account';
import AddAccountButton from './addAccountButton'
import EmailSettings from './emailSettings'
import PasswordSettings from './passwordSettings'

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      serviceList: Array(),
      accounts: Array(),
      user: null,
    };
    this.fetchAccountSettings();
  }

  fetchAccountSettings() {
    var accounts = axios.get('/account/api/accounts')
    var serviceList = axios.get('/account/api/services')
    var user = axios.get('/account/api/user/')

    Promise.all([accounts, serviceList, user]).then(values => {
      this.setState({
        accounts: values[0].data,
        serviceList: values[1].data,
        user: values[2].data,
        loading: false
      })
    }).catch(err => console.log(err))
  }

  render () {
    if(this.state.loading) {
      return (<h1> Loading... </h1>);
    }
    return (
      <div className="container" id="div">
        <h1>Account Settings</h1>
        <hr />
        <h2>General</h2>
        <form method="post" action="/account">

          <EmailSettings user={this.state.user} />
          <PasswordSettings />

          <hr />
          <br />
          <div className="row">
            <div className="col-8 col-sm-9 col-lg-10">
              <h2 className="d-inline">Linked accounts</h2><h2 className="d-md-inline d-none"> and wallets</h2>
            </div>

            <div className="col-4 col-sm-3 col-lg-2">
              <AddAccountButton
                serviceList={this.state.serviceList}
                updateAccountList={this.fetchAccountSettings.bind(this)} />
            </div>

          </div>
        </form>

        { this.state.accounts.sort((a, b) => {
            return new Date(b.timestampCreated).getTime() - new Date(a.timestampCreated).getTime()
          }).map(account => {
          return <Account
            key={account._id}
            service={this.state.serviceList.filter(s=>s.key == account.service)[0]}
            account={account}
            updateAccountList={this.fetchAccountSettings.bind(this)} />

        })}

        { this.state.accounts.length == 0
          ? <div className="no-accounts-message">You'll need to add an account before using Polytrader.</div>
          : null }

        <div className="modal fade" id="passwordModal" tabIndex={-1} role="dialog" aria-labelledby="passwordModal" aria-hidden="true">
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title" id="exampleModalLabel">Password change</h2>
                <button className="close" type="button" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>
              </div>
              <div className="modal-body">
                <form lpformnum={1}>
                  <div className="form-group row">
                    <label className="col-md-3 col-form-label" htmlFor="email">Old password</label>
                    <div className="col-md-9"><input className="form-control" id="email" type="password" name="email" placeholder="Password" required /></div>
                  </div>
                  <div className="form-group row">
                    <label className="col-md-3 col-form-label" htmlFor="password-change">New password</label>
                    <div className="col-md-9"><input className="form-control" id="email" type="password" name="email" placeholder="Password" required /></div>
                  </div>
                  <div className="form-group row">
                    <label className="col-md-3 col-form-label" htmlFor="password-change">Repeat password</label>
                    <div className="col-md-9"><input className="form-control" id="email" type="password" name="email" placeholder="Password" required /></div>
                  </div>
                </form>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" type="button" data-dismiss="modal">Close</button><button className="btn btn-danger" type="button">Change password</button></div>
            </div>
          </div>
        </div>

      </div>
    );
  }
}

render(<App/>, document.getElementById('settingsApp'));
