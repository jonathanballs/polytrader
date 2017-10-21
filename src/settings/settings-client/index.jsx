import React from 'react';
import {render} from 'react-dom';

class App extends React.Component {
  render () {
    return (
      <div className="container" id="div">
        <h1>Account Settings</h1>
        <hr />
        <br />
        <h2>General</h2>
        <div id="settingsApp">
          <p> Hello React!</p>
        </div>
        <form method="post" action="/account">
          <div className="form-group row"><label className="col-md-2 col-form-label" htmlFor="email">Email</label><input className="col-md-10 form-control" id="email" type="email" name="email" placeholder="Email" required defaultValue="jonathanballs@protonmail.com" /></div>
          <div className="form-group row">
            <label className="col-md-2 col-form-label" htmlFor="password-change">Password</label>
            <div className="col-md-3" style={{padding: 0}}><button className="btn btn-block" type="button" data-toggle="modal" data-target="#passwordModal">Change Password</button></div>
          </div>
          <hr />
          <br />
          <div className="row">
            <div className="col-md-11">
              <h2>Linked accounts and wallets</h2>
            </div>
            <div className="col-md-1" style={{padding: 0}}><button className="btn btn-block" type="button" data-toggle="modal" data-target="#addAccountModal">Add</button></div>
          </div>
          <div className="exchange-settings">
            <div className="row">
              <div className="col-md-2"><img className="exchange-logo" src="/static/images/exchange-logos/poloniex.png" /></div>
              <div className="col-md-9" />
              <div className="col-md-1" style={{padding: 0}}><button className="btn btn-block" type="button">Edit</button></div>
            </div>
            <div className="row">
              <div className="col-md-2 exchange-property">API Key</div>
              <div className="col-md-10 exchange-property-val">H8OBW9VT-EZHK6C9G-7UOFTGS3-EZZZN9YV</div>
            </div>
            <div className="row">
              <div className="col-md-2 exchange-property">API Secret</div>
              <div className="col-md-10 exchange-property-val">**********************************************************************************</div>
            </div>
            <div className="row">
              <div className="col-md-2 exchange-property">Added</div>
              <div className="col-md-10 exchange-property-val">4 months ago</div>
            </div>
            <div className="row">
              <div className="col-md-2 exchange-property">Last Synced</div>
              <div className="col-md-10 exchange-property-val">24 seconds ago</div>
            </div>
          </div>
        </form>
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
        <div className="modal fade" id="addAccountModal" tabIndex={-1} role="dialog" aria-labelledby="addAccountModal" aria-hidden="true">
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title" id="exampleModalLabel">Add Account</h2>
                <button className="close" type="button" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>
              </div>
              <div className="modal-body" style={{minHeight: '20em'}}>
                <div className="carousel slide" id="addAccountCarousel">
                  <div className="carousel-inner" role="listbox">
                    <div className="carousel-item active">
                      <div className="col-md-12 account-type-selection"><button className="btn btn-lg btn-light btn-block" type="button">Poloniex</button></div>
                      <div className="col-md-12 account-type-selection"><button className="btn btn-lg btn-light btn-block" type="button">Bittrex</button></div>
                    </div>
                    <div className="carousel-item add-account-form">
                      <div className="row">
                        <div className="col-md-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer"><button className="btn-loader btn btn-primary col-md-3" id="addAccountSubmitButton" type="submit" style={{opacity: 0}}>Add Account</button><button className="btn btn-secondary" type="button" data-dismiss="modal">Close</button></div>
            </div>
          </div>
        </div>
        <div id="addPoloniexAccountForm" style={{display: 'none'}}>
          <div className="row">
            <div className="col-md-3"><img className="exchange-logo" src="/static/images/exchange-logos/poloniex.png" style={{width: '100%'}} /></div>
          </div>
          <br />
          <form id="poloniexAddAccountForm">
            <input id="accountType" type="hidden" name="account-type" defaultValue="poloniex" />
            <div className="form-group row">
              <label className="col-md-2 col-form-label" htmlFor="apiKey">API Key</label>
              <div className="col-md-10"><input className="form-control" id="poloniexApiKey" type="text" name="poloniexApiKey" placeholder="Poloniex API Key" required /></div>
            </div>
            <div className="form-group row">
              <label className="col-md-2 col-form-label" htmlFor="apiSecret">API Secret</label>
              <div className="col-md-10"><input className="form-control" id="poloniexApiSecret" type="text" name="poloniexApiSecret" placeholder="Poloniex API Secret" required /></div>
            </div>
            <div className="form-group row">
              <div className="col-md-12">
                <p id="addAccountErrorMessage" />
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

render(<App/>, document.getElementById('settingsApp'));
