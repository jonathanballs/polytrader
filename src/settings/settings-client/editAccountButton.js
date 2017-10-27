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
      submissionState: 'none', // none, loading, success or failure
      submissionErrorMessage: '',
      deleteButtonState: 'none'
    }

    this.setSubmissionState.bind(this)
  }

  toggleModal = () => {
    this.setState({ showModal: !this.state.showModal })
  }

  submitAccountForm = () => {
    this.setState({ submissionState: 'loading' })

    // Get form values
    var formValues = this.props.service.formFields.reduce((acc, f) => {
      acc[f.name] = document.getElementsByName(f.name)[0].value
      return acc
    }, { service: this.props.service.key })

    // Make the post request
    axios.post('/account/api/accounts/' + this.props.accountID, qs.stringify(formValues))
      .then((resp) => {
        this.setState({ submissionState: 'success' })
        this.props.onSubmitted();
      }).catch(err => {
        this.setState({ submissionState: 'failure', submissionErrorMessage: err.response ? err.response.data : err.message })
      })
  }

  deleteAccount = () => {
    this.setState({ deleteButtonState: 'deleting' })

    axios.delete('/account/api/accounts/' + this.props.accountID)
      .then((resp) => {
        this.props.onSubmitted();
        this.setState({ showModal: false })
      })
  }

  setSubmissionState = (newState) => {
    this.setState({ submissionState: newState })
  }

  render() {

    var accountButton = null;
    switch (this.state.submissionState) {
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
    switch (this.state.deleteButtonState) {
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

        <Modal
          className="add-account-modal"
          onClosed={(() => { this.setState({ submissionState: 'none', deleteButtonState: 'none' }) }).bind(this)}
          isOpen={ this.state.showModal }
          size="lg"
          toggle={ this.toggleModal } >

          <div className="modal-header">
            <h2 className="modal-title">Edit Account</h2>
          </div>
          <div className="modal-body">
            <AccountForm
              service={ this.props.service }
              submissionState={ this.state.submissionState }
              setSubmissionState={ this.setSubmissionState }
              errorMessage={ this.state.submissionErrorMessage }
              formValues={ this.props.formValues } />
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

EditAccountButton.propTypes = {
  status: PropTypes.oneOf(['none', 'failure', 'success', 'loading']),
  onSubmitted: PropTypes.func,
  formValues: PropTypes.objects,
  accountID: PropTypes.string,
  service: {
    key: PropTypes.string,
    name: PropTypes.string,
    formValues: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      description: PropTypes.string,
      placeholder: PropTypes.string,
    }))
  },
}
