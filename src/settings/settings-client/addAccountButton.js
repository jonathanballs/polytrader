import React from 'react'
import { render } from 'react-dom'
import PropTypes from 'prop-types'
import { Modal, Button, Carousel, CarouselItem } from 'reactstrap'
import axios from 'axios'
import qs from 'qs'

import AccountForm from './accountForm.js'

export default class AddAccountButton extends React.Component {

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
    })
  }

  goToSlide = (slideNum) => {
    // Reset form
    if (slideNum == 1) {
      var accountForm = this.props.serviceList.filter(f => f.key == this.state.currentAccountForm)[0]
      accountForm.formFields.forEach(f => {
        document.getElementsByName(f.name)[0].value = ""
      })
    }
    this.setState({ activeSlide: slideNum, submissionStatus: 'none' });
  }

  submitAccountForm = () => {
    var accountForm = this.props.serviceList.filter(f => f.key == this.state.currentAccountForm)[0]
    this.setState({ submissionStatus: 'loading' })

    // Get form values
    var formValues = accountForm.formFields.reduce((acc, f) => {
      acc[f.name] = document.getElementsByName(f.name)[0].value
      return acc
    }, { accountType: accountForm.key })

    // Make the post request
    axios.post('/account/api/accounts/', qs.stringify(formValues))
      .then((resp) => {
        this.setState({ submissionStatus: 'success' })
        this.props.updateAccountList();
      }).catch(err => {
        this.setState({ submissionStatus: 'failure', submissionErrorMessage: err.response.data })
      })
  }

  setSubmissionState = (newState) => {
    this.setState({submissionStatus: newState})
  }

  render() {

    var accountButton = null;
    if (this.state.activeSlide == 1) {
      switch (this.state.submissionStatus) {
        case 'none':
          accountButton = <Button onClick={this.submitAccountForm} block={true} color="primary">Add Account</Button>
          break
        case 'loading':
          accountButton = <Button block={true} color="primary"><i className="fa fa-circle-o-notch fa-spin"></i> Adding</Button>
          break
        case 'failure':
          accountButton = <Button block={true} color="danger"><i className="fa fa-cross"></i> Failed</Button>
          break
        case 'success':
          accountButton = <Button onClick={this.toggleModal} block={true} color="success"><i className="fa fa-check"></i> Success</Button>
          break
      }
    }

    var slides = [<CarouselItem key='1' src=''>
      <div>
        {this.props.serviceList.map((service, i) => {
          return (<div key={i} className="row">
            <div className="col-md-12 account-type-selection">
              <Button block={true} size="lg" color="light"
                onClick={() => {
                  this.setState({ currentAccountForm: service.key });
                  this.goToSlide(1);
                }}>{service.name}</Button>
            </div>
          </div>)
        })}
      </div>
    </CarouselItem>,
    <CarouselItem key='2' src=''>
      <AccountForm
        service={this.props.serviceList.filter(s => s.key == this.state.currentAccountForm)[0]}
        status={this.state.submissionStatus}
        setState={this.setSubmissionState}
        errorMessage={this.state.submissionErrorMessage} />
    </CarouselItem>
    ]

    return (
      <div className="col-md-1" style={{ padding: 0 }}>
        <Button block={true} color="primary" onClick={this.toggleModal}>Add</Button>

        <Modal className="add-account-modal" onClosed={(() => {this.goToSlide(0)}).bind(this)} isOpen={this.state.showModal} size="lg" toggle={this.toggleModal}>
          <div className="modal-header">
            <h2 className="modal-title">Add Account</h2>
          </div>
          <div className="modal-body">

            <Carousel activeIndex={this.state.activeSlide} previous={() => { }} next={() => { }}>
              {slides}
            </Carousel>

          </div>
          <div className="modal-footer">
            {this.state.activeSlide == 1 ? <Button color="secondary" onClick={_ => { this.goToSlide(0) }}>Back</Button> : null}
            <div className="col-md-6"></div>
            {accountButton}
            <Button color="secondary" onClick={this.toggleModal}>Close</Button>
          </div>
        </Modal>
      </div>
    )
  }
}
