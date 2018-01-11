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
      submissionState: 'none', // none, loading, success or failure
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
    this.setState({ activeSlide: slideNum, submissionState: 'none' });
  }

  submitAccountForm = () => {
    var accountForm = this.props.serviceList.filter(f => f.key == this.state.currentAccountForm)[0]
    this.setState({ submissionState: 'loading' })

    // Get form values
    var formData = new FormData()
    formData.append('service', accountForm.key)

    accountForm.formFields.forEach(ff => {
      if (ff.type == 'file') {
        formData.append(ff.name, document.getElementsByName(ff.name)[0].files[0])
      }
      else {
        formData.append(ff.name, document.getElementsByName(ff.name)[0].value)
      }
    })

    // Make the post request
    axios.post('/account/api/accounts/', formData)
      .then((resp) => {
        this.setState({ submissionState: 'success' })
        this.props.updateAccountList();
      }).catch(err => {
        this.setState({ submissionState: 'failure', submissionErrorMessage: err.response.data })
      })
  }

  setSubmissionState = (newState) => {
    this.setState({submissionState: newState})
  }

  render() {
    var accountButton = null;
    if (this.state.activeSlide == 1) {
      switch (this.state.submissionState) {
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
    if (this.state.currentAccountForm == "coinbase") {
      accountButton = null;
    }

    // Disable PropType warnings for CarouselItem
    CarouselItem.propTypes.children = PropTypes.any

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
        submissionState={this.state.submissionState}
        setSubmissionState={this.setSubmissionState}
        errorMessage={this.state.submissionErrorMessage} />
    </CarouselItem>
    ]

    return (
      <div>
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
            {this.state.activeSlide == 1 ? <Button block={true} color="secondary" onClick={_ => { this.goToSlide(0) }}>Back</Button> : null}
            { accountButton ? <div className="col-md-6"></div> : <div className="col-md-8"></div>}
            {accountButton}
            <Button color="secondary" onClick={this.toggleModal}>Close</Button>
          </div>
        </Modal>
      </div>
    )
  }
}

AddAccountButton.propTypes = {
  serviceList: PropTypes.arrayOf(PropTypes.object),
  updateAccountList: PropTypes.func
}
