import React from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types'
import moment from 'moment'
import EditAccountButton from './editAccountButton'

export default class Account extends React.Component {
  makeRow(title, content) {
    return(
        <div className="row">
          <div className="col-md-2 exchange-property">{title}</div>
          <div className="col-md-10 exchange-property-val">{content}</div>
        </div>

    )
  }
  
  render() {
    const { type, apiKey, apiSecret, timestampCreated } = this.props.account;

    var formValues = this.props.serviceList.filter(a => a.key == type)[0].formFields.reduce((acc, ff) => {
      acc[ff.name] = this.props.account[ff.name]
      return acc
    }, {})

    return (
      <div className="exchange-settings">
        <div className="row">
          <div className="col-md-2"><img className="exchange-logo" src={"/static/images/exchange-logos/" + type + ".png"} /></div>
          <div className="col-md-9" />
          <EditAccountButton
            account={this.props.account}
            status='none'
            setState={()=>{}}
            errorMessage=""
            formValues={formValues}
            serviceList={this.props.serviceList}
            updateAccountList={this.props.updateAccountList}/>
        </div>
        { this.makeRow('API Key', apiKey) }
        { this.makeRow('API Secret', '*****************************************************************************' ) }
        { this.makeRow('Added', moment(timestampCreated).fromNow()) }
        { this.makeRow('Last Synced', '24 seconds ago') }
      </div>
    )
  }
}
