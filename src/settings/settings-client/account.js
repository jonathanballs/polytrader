import React from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types'
import moment from 'moment'
import EditAccountButton from './editAccountButton'

export default class Account extends React.Component {
  makeRow(title, content) {
    return(
        <div className="row" key={title}>
          <div className="col-4 exchange-property">{title}</div>
          <div className="col-8 exchange-property-val">{content}</div>
        </div>

    )
  }
  
  render() {

    var userVariables = this.props.service.formFields.map(ff => {
      var varValue

      if (ff.name.toLowerCase().includes("secret")) {
        varValue = "*******************************************************************************"
      }
      else if (ff.type == 'file') {
        varValue = this.props.account.userAuth[ff.name].originalFilename
      }
      else {
        varValue = this.props.account.userAuth[ff.name]
      }

      return this.makeRow(ff.description, varValue)
    })

    var syncStatus = null
    if (this.props.account.timestampLastSync == null) {
      syncStatus = <span className="badge badge-info">Never synced</span>
    }
    else if (this.props.account.lastSyncWasSuccessful === true) {
      syncStatus = <span title={this.props.account.timestampLastSync} className="badge badge-success">
        { moment(this.props.account.timestampLastSync).fromNow() }
      </span>
    }
    else {
      syncStatus = <span className="badge badge-danger">
        { moment(this.props.account.timestampLastSync).fromNow() }

        { this.props.account.lastSyncErrorMessage
          ? this.props.account.lastSyncErrorMessage
          : "Failed for unknown reason"
        }
      </span>
    }

    return (
      <div className="exchange-settings">
        <div className="row">
          <div className="col-6 col-lg-10"><img className="exchange-logo" src={"/static/images/exchange-logos/" + this.props.service.key + ".png"} /></div>
          <div className="col-4 offset-2 col-sm-3 offset-sm-3 col-lg-2 offset-lg-0">
            <EditAccountButton
              service={ this.props.service }
              errorMessage=""
              formValues={ this.props.account.userAuth }
              accountID={ this.props.account._id }
              onSubmitted={ this.props.updateAccountList } />
          </div>
        </div>
        { userVariables }
        { this.makeRow('Added', <span title={this.props.account.timestampCreated}>
          {moment(this.props.account.timestampCreated).fromNow()}
        </span>) }
        { this.makeRow('Syncronisation', syncStatus)}
      </div>
    )
  }
}


Account.propTypes = {
  updateAccountList: PropTypes.func,
  formValues: PropTypes.object,
  account: PropTypes.shape({
    _id: PropTypes.string,
    service: PropTypes.string,
    userAuth: PropTypes.object
  }).isRequired,
  service: PropTypes.shape({
    key: PropTypes.string,
    name: PropTypes.string,
    formFields: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      description: PropTypes.string,
      placeholder: PropTypes.string,
    }))
  }).isRequired,
}
