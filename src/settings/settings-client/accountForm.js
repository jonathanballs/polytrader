import React from 'react'
import { render } from 'react-dom'
import PropTypes from 'prop-types'
import { Modal, Button, Carousel, CarouselItem } from 'reactstrap'
import axios from 'axios'
import qs from 'qs'
import * as clone from 'clone'

const propTypes = {
    disabled: PropTypes.bool,
    errorMessage: PropTypes.string,
    formValues: PropTypes.object,
    onChange: PropTypes.func,
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

export default class AccountForm extends React.Component {

    constructor(props) {
        super(props)
        this.state = {}

        if (this.props.formValues) {
            this.state = this.props.formValues;
        } else {
            // Generate an empty state
            this.state = this.props.service.formFields.map((formField => {
                return { key: formField.name, value: formField.type === "text" ? "" : null }
            })).reduce((prev, curr) => {
                prev[curr.key] = curr.value;
                return prev;
            }, {})
        }

        this.handleChange = this.handleChange.bind(this);
    }

    // Handle changes to a form field
    handleChange(event) {
        if (this.props.onChange) {
            this.props.onChange();
        }

        const target = event.target;
        const value = target.type === "text" ? target.value : { originalFilename: target.value };
        this.setState({[target.name]: value});
    }

    render() {

        // Turn form fields into text inputs and file buttons and populate them with
        // appropriate form values.
        var accountFormFields = this.props.service.formFields.map((ff, i) => {
            const fieldValue = this.state[ff.name];

            let fileButton = null;
            if (ff.type === "file") {
                const buttonText = fieldValue ? fieldValue.originalFilename : "Select File";
                fileButton = <button className="btn btn-secondary btn-file">{ buttonText }</button>
            }

            return (
                <div key={i} className="form-group row">
                <label className="col-md-2 col-form-label" htmlFor={ff.name}>{ff.description}</label>
                <div className="col-md-10">
                    <input
                        className="form-control"
                        type={ ff.type }
                        defaultValue={ this.props.formValues ? this.props.formValues[ff.name] : undefined }
                        disabled={ this.props.disabled }
                        name={ ff.name }
                        placeholder={ ff.placeholder }
                        onChange={this.handleChange}
                        required />
                    { fileButton }
                </div>
                </div>
            )
        })

        // Coinbase oauth button
        if (this.props.service.key == 'coinbase') {

            if (this.props.formValues) {
                accountFormFields = [
                    <div key="coinbaseinput" className="form-group row">
                        <div className="col-12">
                            <p>Your coinbase account is already connected</p>
                        </div>
                    </div>
                ]
            } else {
                const redirectUrl = window.location.protocol + "//" + window.location.host + "/account/api/coinbasecallback"
                const permissionsRequired = ["wallet:accounts:read",
                    "wallet:addresses:read", "wallet:buys:read",
                    "wallet:checkouts:read",
                    "wallet:deposits:read", "wallet:notifications:read",
                    "wallet:orders:read", "wallet:payment-methods:read",
                    "wallet:sells:read", "wallet:transactions:read",
                    "wallet:user:read", "wallet:withdrawals:read"].reduce((prev, curr) => {
                        return prev + "," + curr
                    }, "").substr(1);

                const authorisationUrl = "https://www.coinbase.com/oauth/authorize?" +
                    "client_id=8cc804e451eb2a636534f046a08bd55421865e6e5a05583391cacb262e5016ca" +
                    "&redirect_uri=" + redirectUrl +
                    "&account=all" +
                    "&response_type=code&scope=" + permissionsRequired;

                accountFormFields = [
                    <div key="coinbaseinput" className="form-group row">
                        <div className="col-12">
                            <a href={authorisationUrl}>Click here to connect your coinbase account</a>
                        </div>
                    </div>
                ]
            }
        }

        var accountForm = <div key="2">
            <div className="row">
                <div className="col-md-3">
                    <img className="exchange-logo" src={"/static/images/exchange-logos/" + this.props.service.key + ".png"} />
                </div>
            </div>
            <form onSubmit={e => { e.preventDefault(); }}>
                {accountFormFields}
            </form>

            <div className="row">
                <div className="col-md-12">
                    {this.props.errorMessage ?
                        <p className="add-account-error-message">{this.props.errorMessage}</p>
                        : null}
                </div>
            </div>
        </div>

        return accountForm
    }
}

AccountForm.propTypes = propTypes;
