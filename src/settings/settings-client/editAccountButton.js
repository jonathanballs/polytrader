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

    var formData = new FormData()
    formData.append('service', this.props.service.key)

    this.props.service.formFields.forEach(ff => {
      if (ff.type == 'file') {
        formData.append(ff.name, document.getElementsByName(ff.name)[0].files[0])
      }
      else {
        formData.append(ff.name, document.getElementsByName(ff.name)[0].value)
      }
    })

    // Make the post request
    axios.post('/account/api/accounts/' + this.props.accountID, formData)
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
    if (this.props.service.key == "coinbase") {
      accountButton = null;
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
      <button className="btn btn-secondary" onClick={this.toggleModal}>Edit
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
              disabled={ this.state.submissionState === "loading" }
              errorMessage={ this.state.submissionErrorMessage }
              formValues={ this.props.formValues }
              service={ this.props.service }
              onChange={ () => {this.setState({submissionState: "none", submissionErrorMessage: null})} }
              onSubmit={ () => {
                if (this.state.submissionState === "none") {
                  this.submitAccountForm()
                }
              }}
              />
          </div>
          <div className="modal-footer">
            {deleteButton}
            <div className={accountButton ? "col-md-6" : "col-md-8"}></div>
            {accountButton}
            <Button color="secondary" onClick={this.toggleModal}>Close</Button>
          </div>

        </Modal>
      </button>
    )
  }
}

EditAccountButton.propTypes = {
  status: PropTypes.oneOf(['none', 'failure', 'success', 'loading']),
  onSubmitted: PropTypes.func,
  formValues: PropTypes.object,
  accountID: PropTypes.string,
  service: PropTypes.shape({
    key: PropTypes.string,
    name: PropTypes.string,
    formValues: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      description: PropTypes.string,
      placeholder: PropTypes.string,
    }))
  }),
}
