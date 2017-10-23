import React from 'react'
import { render } from 'react-dom'
import PropTypes from 'prop-types'
import { Modal, Button, Carousel, CarouselItem } from 'reactstrap'
import axios from 'axios'
import qs from 'qs'

export var accountForms = [
    {
        service: 'poloniex',
        formFields: [
            { name: 'apiKey', description: 'API Key', placeholder: 'Poloniex API Key' },
            { name: 'apiSecret', description: 'API Secret', placeholder: 'Poloniex API Secret' },]
    },
    {
        service: 'bittrex',
        formFields: [
            { name: 'apiKey', description: 'API Key', placeholder: 'Bittrex API Key' },
            { name: 'apiSecret', description: 'API Secret', placeholder: 'Bittrex API Secret' },]
    },
    {
        service: 'ethereum wallet',
        formFields: [{ name: 'walletAddress', description: 'Address', placeholder: 'Ethereum Wallet Address' }]
    }
]


export default class AccountForm extends React.Component {
    render() {
        var accountFormDesc = accountForms.filter(a => a.service == this.props.service)[0]
        var accountFormFields = accountFormDesc.formFields.map((ff, i) => {
            return (
                <div key={i} className="form-group row">
                <label className="col-md-2 col-form-label" htmlFor={ff.name}>{ff.description}</label>
                <div className="col-md-10">
                    <input className="form-control"
                    id="poloniexApiKey"
                    type="text"
                    disabled={this.props.status == 'loading'}
                    name={ff.name}
                    placeholder={ff.placeholder}
                    onChange={_ => { this.props.setState('none') }}
                    required />
                </div>
                </div>
            )
        })

        var accountForm = <div key="2">
            <div className="row">
                <div className="col-md-3">
                    <img className="exchange-logo" src={"/static/images/exchange-logos/" + accountFormDesc.service.replace(/\s/g, '') + ".png"} />
                </div>
            </div>
            <form>
                {accountFormFields}
            </form>
            <div className="row">
                <div className="col-md-12">
                    {this.props.status == 'failure' ?
                        <p className="add-account-error-message">{this.props.errorMessage}</p>
                        : <p></p>}
                </div>
            </div>
        </div>

        return accountForm
    }
}
