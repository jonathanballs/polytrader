import React from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types'
import moment from 'moment'

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
    const { type, apiKey, apiSecret, timestampCreated } = this.props;
    return (
      <div className="exchange-settings">
        <div className="row">
          <div className="col-md-2"><img className="exchange-logo" src="/static/images/exchange-logos/poloniex.png" /></div>
          <div className="col-md-9" />
          <div className="col-md-1" style={{ padding: 0 }}><button className="btn btn-block" type="button">Edit</button></div>
        </div>
        { this.makeRow('API Key', apiKey) }
        { this.makeRow('API Secret', '*****************************************************************************' ) }
        { this.makeRow('Added', moment(timestampCreated).fromNow()) }
        { this.makeRow('Last Synced', '24 seconds ago') }
      </div>
    )
  }
}
