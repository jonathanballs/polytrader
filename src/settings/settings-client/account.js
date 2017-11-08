import React from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types'
import moment from 'moment'
import EditAccountButton from './editAccountButton'

export default class Account extends React.Component {
  makeRow(title, content) {
    return(
        <div className="row" key={title}>
          <div className="col-md-2 exchange-property">{title}</div>
          <div className="col-md-10 exchange-property-val">{content}</div>
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

    return (
      <div className="exchange-settings">
        <div className="row">
          <div className="col-md-2"><img className="exchange-logo" src={"/static/images/exchange-logos/" + this.props.service.key + ".png"} /></div>
          <div className="col-md-9" />
          <EditAccountButton
            service={ this.props.service }
            errorMessage=""
            formValues={ this.props.account.userAuth }
            accountID={ this.props.account._id }
            onSubmitted={ this.props.updateAccountList } />

        </div>
        { userVariables }
        { this.makeRow('Added', moment(this.props.account.timestampCreated).fromNow()) }
        { this.makeRow('Last Synced', this.props.account.timestampLastSuccessfulSync
                        ? moment(this.props.account.timestampLastSuccessfulSync).fromNow()
                        : "Never"
        )}
        { this.makeRow('Last Synced', '24 seconds ago') }
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
