import React from 'react'
import { render } from 'react-dom'
import PropTypes from 'prop-types'
import { Modal, Button, Carousel, CarouselItem } from 'reactstrap'
import axios from 'axios'
import qs from 'qs'

const propTypes = {
    submissionState: PropTypes.oneOf(['none', 'failure', 'success', 'loading']),
    setSubmissionState: PropTypes.func,
    errorMessage: PropTypes.string,
    formValues: PropTypes.object,
    service: PropTypes.shape({
        key: PropTypes.string,
        name: PropTypes.string,
        formFields: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string,
            description: PropTypes.string,
            placeholder: PropTypes.string,
        }))
    }),
}

export default class AccountForm extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            inputValues: this.props.formValues
                ? this.props.formValues
                : {}
        }
    }

    render() {

        // Turn form fields into text inputs and file buttons
        var accountFormFields = this.props.service.formFields.map((ff, i) => {
            return (
                <div key={i} className="form-group row">
                <label className="col-md-2 col-form-label" htmlFor={ff.name}>{ff.description}</label>
                <div className="col-md-10">
                    <input className="form-control"
                        id="poloniexApiKey"
                        type={ff.type ? ff.type : 'text'}
                        defaultValue={this.props.formValues ? this.props.formValues[ff.name] : undefined}
                        disabled={this.props.submissionState == 'loading'}
                        name={ff.name}
                        placeholder={ff.placeholder}
                        onChange={evt => {
                            this.props.setSubmissionState('none');
                            this.state.inputValues[ff.name] = evt.target.value
                        }}
                        required />
                    { ff.type == 'file'
                        ? <button className="btn btn-secondary btn-file">
                            { this.state.inputValues[ff.name]
                                ? this.state.inputValues[ff.name].split('\\').reverse()[0].split('/').reverse()[0]
                                : "Select File" }
                          </button>
                        : null }
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
                    {this.props.submissionState == 'failure' ?
                        <p className="add-account-error-message">{this.props.errorMessage}</p>
                        : <p></p>}
                </div>
            </div>
        </div>

        return accountForm
    }
}

AccountForm.propTypes = propTypes;
