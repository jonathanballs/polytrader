import React from 'react'
import { render } from 'react-dom'
import PropTypes from 'prop-types'
import { Modal, Button, Carousel, CarouselItem } from 'reactstrap'
import axios from 'axios'
import qs from 'qs'

import { accountForms } from './accountForm.js'
import AccountForm from './accountForm.js'

export default class EditAccountButton extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showModal: false,
      activeSlide: 0,
      currentAccountForm: 'poloniex',
      submissionStatus: 'none', // none, loading, success or failure
      submissionErrorMessage: '',
    }

    this.setSubmissionState.bind(this)
  }

  toggleModal = () => {
    this.setState({
      showModal: !this.state.showModal,
      activeSlide: 0,
      submissionStatus: 'none'
    })
  }

  submitAccountForm = () => {
    var accountForm = accountForms.filter(f => f.service == this.state.currentAccountForm)[0]
    this.setState({ submissionStatus: 'loading' })

    // Get form values
    var formValues = accountForm.formFields.reduce((acc, f) => {
      acc[f.name] = document.getElementsByName(f.name)[0].value
      return acc
    }, { accountType: accountForm.service })

    // Make the post request
    axios.post('/account/api/accounts/' + this.props.account._id , qs.stringify(formValues))
      .then((resp) => {
        this.setState({ submissionStatus: 'success' })
        this.props.updateAccountList();
        console.log(resp)
      }).catch(err => {
        this.setState({ submissionStatus: 'failure', submissionErrorMessage: err.response.data })
      })
  }

  deleteAccount = () => { }

  setSubmissionState = (newState) => {
    this.setState({submissionStatus: newState})
  }

  render() {

    var accountButton = null;
    switch (this.state.submissionStatus) {
      case 'none':
        accountButton = <Button onClick={this.submitAccountForm} block={true} color="primary">Update</Button>
        break
      case 'loading':
        accountButton = <Button block={true} color="primary"><i className="fa fa-circle-o-notch fa-spin"></i> Updating</Button>
        break
      case 'failure':
        accountButton = <Button block={true} color="danger"><i className="fa fa-cross"></i> Failed</Button>
        break
      case 'success':
        accountButton = <Button onClick={this.toggleModal} block={true} color="success"><i className="fa fa-check"></i> Success</Button>
        break
    }

    return (
      <div className="col-md-1" style={{ padding: 0 }}>
        <Button block={true} color="secondary" onClick={this.toggleModal}>Edit</Button>

        <Modal className="add-account-modal" isOpen={this.state.showModal} size="lg" toggle={this.toggleModal}>
          <div className="modal-header">
            <h2 className="modal-title">Edit Account</h2>
          </div>
          <div className="modal-body">
            <AccountForm service={this.state.currentAccountForm}
              status={this.state.submissionStatus}
              setState={this.setSubmissionState}
              errorMessage={this.state.submissionErrorMessage}
              formValues={this.props.formValues} />
          </div>
          <div className="modal-footer">
            <div className="col-md-7"></div>
            {accountButton}
            <Button color="secondary" onClick={this.toggleModal}>Close</Button>
          </div>
        </Modal>
      </div>
    )
  }
}
