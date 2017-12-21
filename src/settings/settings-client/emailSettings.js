import React from 'react'
import { render } from 'react-dom'
import axios from 'axios'

export default class EmailSettings extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            email: this.props.user.email,
            emailSubmitStatus: 'none',
            emailHasChanged: false,
        }

        this.updateEmail = this.updateEmail.bind(this)
    }

    updateEmail(evt) {
        evt.preventDefault()

        this.state.emailSubmitStatus = 'loading'
        axios.post('/account/api/user/', { email: this.state.email })
            .then(() => {
                this.setState({
                    emailSubmitStatus: 'success',
                    emailHasChanged: false,
                })
            })
            .catch(err => {
                var error = err.response ? err.response.data : err.message

                this.setState( {
                    emailSubmitStatus: 'failure',
                    emailSubmitErrorMessage: error,
                    emailHasChanged: false,
                })
            })
    }

    render() {

        var submitButton = <button className="btn btn-success float-right" disabled={!this.state.emailHasChanged} onClick={this.updateEmail}>Update</button>

        if (this.state.emailSubmitStatus == 'loading') {
            submitButton = <button disabled className="btn btn-success float-right" disabled={!this.state.emailHasChanged} onClick={this.updateEmail}>
            Saving...
            </button>
        }
        else if (this.state.emailSubmitStatus == 'success') {
            submitButton = <button disabled className="btn btn-success float-right">Saved</button>
        }
        else if (this.state.emailSubmitStatus == 'failure') {
            submitButton = <button disabled className="btn btn-danger float-right">Error</button>
        }

        return (
            <div className="form-group row">
                <label className="col-md-2 col-form-label" htmlFor="email">Email</label>
                <input
                    className="col-md-4 form-control"
                    id="email"
                    type="email"
                    name="email"
                    defaultValue={this.props.user.email}
                    onChange={e => { this.setState({ email: e.target.value, emailHasChanged: true, emailSubmitStatus: 'none' }) }}
                    placeholder="Email"
                    required />
                <div className="col-md-6" style={{ padding: 0 }}>
                    { submitButton }
                </div>
                <div className="col-md-2" />
                <div className="col-md-10">
                    <span className="error-message">{this.state.emailSubmitStatus == 'failure' ? this.state.emailSubmitErrorMessage : null}</span>
                </div>
            </div>
        )
    }

}
