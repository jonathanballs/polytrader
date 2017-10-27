import React from 'react'
import { render } from 'react-dom'
import PropTypes from 'prop-types'
import { Modal, Button, Carousel, CarouselItem } from 'reactstrap'
import axios from 'axios'
import qs from 'qs'

export default class AccountForm extends React.Component {

    render() {
        var accountFormFields = this.props.service.formFields.map((ff, i) => {
            return (
                <div key={i} className="form-group row">
                <label className="col-md-2 col-form-label" htmlFor={ff.name}>{ff.description}</label>
                <div className="col-md-10">
                    <input className="form-control"
                        id="poloniexApiKey"
                        type="text"
                        defaultValue={this.props.formValues ? this.props.formValues[ff.name] : undefined}
                        disabled={this.props.submissionState == 'loading'}
                        name={ff.name}
                        placeholder={ff.placeholder}
                        onChange={_ => { this.props.setSubmissionState('none') }}
                        required />
                </div>
                </div>
            )
        })

        var accountForm = <div key="2">
            <div className="row">
                <div className="col-md-3">
                    <img className="exchange-logo" src={"/static/images/exchange-logos/" + this.props.service.key + ".png"} />
                </div>
            </div>
            <form>
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

AccountForm.propTypes = {
    submissionState: PropTypes.oneOf(['none', 'failure', 'success', 'loading']),
    setSubmissionState: PropTypes.func,
    errorMessage: PropTypes.string,
    formValues: PropTypes.object,
    service: PropTypes.shape({
        key: PropTypes.string,
        name: PropTypes.string,
        formFields: PropTypes.arrayOf({
            name: PropTypes.string,
            description: PropTypes.string,
            placeholder: PropTypes.string,
        })
    }),
}
