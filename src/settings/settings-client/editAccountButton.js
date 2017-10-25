import React from 'react'
import { render } from 'react-dom'
import PropTypes from 'prop-types'
import { Modal, Button, Carousel, CarouselItem } from 'reactstrap'
import axios from 'axios'
import qs from 'qs'

import AccountForm from './accountForm.js'

export default class EditAccountButton extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showModal: false,
      currentAccountForm: 'poloniex',
      submissionStatus: 'none', // none, loading, success or failure
      submissionErrorMessage: '',
      deleteButtonState: 'none'
    }

    this.setSubmissionState.bind(this)
  }

  toggleModal = () => {
    this.setState({
      showModal: !this.state.showModal
    })
  }

  submitAccountForm = () => {
    this.setState({ submissionStatus: 'loading' })

    // Get form values
    var form = this.props.serviceList.filter(s => s.key == this.props.account.type)[0]
    var formValues = form.formFields.reduce((acc, f) => {
      acc[f.name] = document.getElementsByName(f.name)[0].value
      return acc
    }, { accountType: this.props.account.type })

    // Make the post request
    axios.post('/account/api/accounts/' + this.props.account._id , qs.stringify(formValues))
      .then((resp) => {
        this.setState({ submissionStatus: 'success' })
        this.props.updateAccountList();
      }).catch(err => {
        this.setState({ submissionStatus: 'failure', submissionErrorMessage: err.response.data })
      })
  }

  deleteAccount = () => {
    this.setState({ deleteButtonState: 'deleting' })

    axios.delete('/account/api/accounts/' + this.props.account._id)
    .then((resp) => {
      this.props.updateAccountList();
      this.setState({ showModal: false })
    })
  }

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

    var deleteButton = null
    switch(this.state.deleteButtonState) {
      case 'none':
        deleteButton = <Button block={true} color="secondary"
          onClick={_ => {
            this.setState({ deleteButtonState: 'loading' })
            setTimeout(_ => {
              if (this.state.deleteButtonState == 'loading')
                this.setState({ deleteButtonState: 'ready' })
            }, 2000)
            }
          }>Delete</Button>
        break;
      case 'loading':
        var deleteButton = <Button block={true} disabled color="secondary"><i className="fa fa-circle-o-notch fa-spin"></i> Delete</Button>
        break
      case 'ready':
        var deleteButton = <Button block={true} color="danger" onClick={this.deleteAccount}>Confirm</Button>
        break
      case 'deleting':
        var deleteButton = <Button block={true} disabled color="danger" onClick={this.deleteAccount}><i className="fa fa-circle-o-notch fa-spin" /> Deleting</Button>
        break

    }

    return (
      <div className="col-md-1" style={{ padding: 0 }}>
        <Button block={true}
          color="secondary"
          onClick={this.toggleModal}
        >Edit</Button>

        <Modal className="add-account-modal" onClosed={(() => {this.setState({ submissionStatus: 'none', deleteButtonState: 'none' })}).bind(this)} isOpen={this.state.showModal} size="lg" toggle={this.toggleModal}>
          <div className="modal-header">
            <h2 className="modal-title">Edit Account</h2>
          </div>
          <div className="modal-body">
            <AccountForm
              service={this.props.serviceList.filter(s => s.key == this.state.currentAccountForm)[0]}
              status={this.state.submissionStatus}
              setState={this.setSubmissionState}
              errorMessage={this.state.submissionErrorMessage}
              formValues={this.props.formValues} />
          </div>
          <div className="modal-footer">
            {deleteButton}
            <div className="col-md-6"></div>
            {accountButton}
            <Button color="secondary" onClick={this.toggleModal}>Close</Button>
          </div>
        </Modal>
      </div>
    )
  }
}
