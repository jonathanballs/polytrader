import React from 'react';
import {render} from 'react-dom';
import PropTypes from 'prop-types'

export default class Account extends React.Component {
  // static propTypes = {
  //   type: PropTypes.string.isRequired,
  //   apiKey: PropTypes.string.isRequired,
  //   apiSecret: PropTypes.string.isRequired,
  // };

  makeRow(title, content) {
    return(
        <div className="row">
          <div className="col-md-2 exchange-property">{title}</div>
          <div className="col-md-10 exchange-property-val">{content}</div>
        </div>

    )
  }
  
  render() {
    const { type, apiKey, apiSecret } = this.props;
    return (
      <div className="exchange-settings">
        <div className="row">
          <div className="col-md-2"><img className="exchange-logo" src="/static/images/exchange-logos/poloniex.png" /></div>
          <div className="col-md-9" />
          <div className="col-md-1" style={{ padding: 0 }}><button className="btn btn-block" type="button">Edit</button></div>
        </div>
        { this.makeRow('API Key', apiKey) }
        { this.makeRow('API Secret', apiSecret) }
        { this.makeRow('Added', '4 months ago') }
        { this.makeRow('Last Synced', '24 seconds ago') }

      </div>
    )
  }
}
