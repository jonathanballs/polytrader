import React from 'react'
import { render } from 'react-dom'
import axios from 'axios'
import { Modal } from 'reactstrap'

export default class PasswordSettings extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            showModal: false,
            submissionState: 'none',
            errorMessage: "",
            formValues: {
                oldPassword: '',
                newPassword1: '',
                newPassword2: '',
            },
        }

        this.toggleModal = this.toggleModal.bind(this)
        this.submitForm = this.submitForm.bind(this)
        this.makeFormField = this.makeFormField.bind(this)
    }

    toggleModal() {
        this.setState({ showModal: !this.state.showModal })
    }

    makeFormField(title, name, placeholder) {

        return (<div className="form-group row">
            <label className="col-md-3 col-form-label" htmlFor="email">{ title }</label>
            <div className="col-md-9">
                <input className="form-control"
                    type="password"
                    name={name}
                    onChange={(evt) => {
                        this.setState({
                            submissionState: 'none', errorMessage: '',
                            formValues: Object.assign({}, this.state.formValues, {[name]: evt.target.value})
                        })
                    }}
                    placeholder={placeholder}
                    required />
            </div>
        </div>)
    }

    submitForm() {
        var fv = this.state.formValues;

        // Do some client side validation as well
        if (fv.oldPassword.length < 8) {
            this.setState({
                errorMessage: 'Please input your old password correctly',
                submissionState: 'failure',
            })
            return
        }
        else if (fv.newPassword1.length < 8) {
            this.setState({
                errorMessage: 'Your new password must be 8 characters or longer',
                submissionState: 'failure',
            })
            return
        }
        else if (fv.newPassword1 != fv.newPassword2) {
            this.setState({
                errorMessage: 'Your new passwords do not match',
                submissionState: 'failure',
            })
            return
        }

        axios.post('/account/api/password/', fv)
        .then(resp => {
            this.setState({ submissionState: 'success' })
        })
        .catch(err => {
            this.setState({
                submissionState: 'failure',
                errorMessage: err.response ? err.response.data : err.message,
            })
        })
    }

    render() {

        var changePasswordButton = <button className="btn btn-info" type="button" onClick={this.submitForm}>Change password</button>

        if (this.state.submissionState == 'success') {
            changePasswordButton = <button className="btn btn-success" type="button" onClick={this.toggleModal}>Password changed</button>
        }
        else if (this.state.submissionState == 'failure') {
            changePasswordButton = <button className="btn btn-danger" type="button" onClick={this.submitForm}>Error.</button>
        }

        return (
            <div className="form-group row">
                <label className="col-md-2 col-form-label" htmlFor="password-change">Password</label>
                <div className="col-md-4" style={{ padding: 0 }}>
                    <button
                        className="btn btn-block"
                        onClick={evt => { evt.preventDefault(); this.toggleModal() }}>
                        Change Password
                    </button>
                </div>

                <Modal
                    className="change-password-modal"
                    onClosed={(() => { this.setState({ submissionState: 'none', deleteButtonState: 'none' }) }).bind(this)}
                    isOpen={this.state.showModal}
                    size="lg"
                    toggle={this.toggleModal} >

                    <div className="modal-header">
                        <h2 className="modal-title">Change Password</h2>
                    </div>
                    <div className="modal-body">
                        <form lpformnum={1}>
                            { this.makeFormField('Old password', 'oldPassword', 'Password')}
                            { this.makeFormField('New password', 'newPassword1', 'Password')}
                            { this.makeFormField('Repeat password', 'newPassword2', 'Password')}
                        </form>
                        <span className="error-message">{ this.state.submissionState == 'failure'
                                                            ? this.state.errorMessage
                                                            : null }</span>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" type="button" onClick={this.toggleModal}>Close</button>
                        { changePasswordButton }
                    </div>
                </Modal>
            </div>
        )
    }
}
