import React from 'react'
import { render } from 'react-dom'
import PropTypes from 'prop-types'
import { Modal, Button, Carousel, CarouselItem } from 'reactstrap'

export default class AddAccount extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showModal: false,
      activeSlide: 0,
      currentAccountForm: 'poloniex',
      submissionStatus: 'none' // none, loading, success or failure
    }
  }

  accountForms = [
    {
      service: 'poloniex',
      formFields: [
        { name: 'apiKey', description: 'API Key', placeholder: 'Poloniex API Key' },
        { name: 'apiSecret', description: 'API Secret', placeholder: 'Poloniex API Secret' },]
    },
    {
      service: 'bittrex',
      formFields: [
        { name: 'apiKey', description: 'API Key', placeholder: 'Bittrex API Key' },
        { name: 'apiSecret', description: 'API Secret', placeholder: 'Bittrex API Secret' },]
    },
    {
      service: 'ethereum wallet',
      formFields: [{ name: 'walletAddress', description: 'Address', placeholder: 'Ethereum Wallet Address' }]
    }
  ]

  toggleModal = () => {
    this.setState({
      showModal: !this.state.showModal,
      activeSlide: 0
    })
  }

  goToSlide = (slideNum) => {
    this.setState({ activeSlide: slideNum });
  }

  submitAccountForm = () => {
    var formFields = this.accountForms.filter(f => f.service == this.state.currentAccountForm)[0]
    this.setState({ submissionStatus: 'loading' })

    setTimeout(_ => this.setState({ submissionStatus: 'success' }), 3000)

  }

  makeAccountForm = (account) => {
    var accountFormDesc = this.accountForms.filter(a => a.service == account)[0]
    var accountFormFields = accountFormDesc.formFields.map((ff, i) => {
      return (
        <div key={i} className="form-group row">
          <label className="col-md-2 col-form-label" htmlFor={ff.name}>{ff.description}</label>
          <div className="col-md-10">
            <input className="form-control" id="poloniexApiKey" type="text" name={ff.name} placeholder={ff.placeholder} required />
          </div>
        </div>
      )
    })

    var accountForm = <div key="2">
      <div className="row">
        <div className="col-md-3">
          <img className="exchange-logo" src={"/static/images/exchange-logos/" + accountFormDesc.service.replace(/\s/g, '') + ".png"} />
        </div>
      </div>
      <form>
        {accountFormFields}
      </form>
    </div>

    return accountForm

  }

  render() {
    var slides = [<CarouselItem key='1' src=''>
      <div>
        {this.accountForms.map((form, i) => {
          return (<div key={i} className="col-md-12 account-type-selection">
            <Button block={true} size="lg" color="light"
              onClick={() => {
                this.setState({ currentAccountForm: form.service, activeSlide: 1 });
              }}>{form.service}</Button>
          </div>)
        })}
      </div>
    </CarouselItem>,
    <CarouselItem key='2' src=''>
      {this.makeAccountForm(this.state.currentAccountForm)}
    </CarouselItem>
    ]

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
          accountButton = <Button block={true} color="success"><i className="fa fa-check"></i> Success</Button>
          break
      }
    }

    return (
      <div className="col-md-1" style={{ padding: 0 }}>
        <Button block={true} onClick={this.toggleModal}>Add</Button>

        <Modal className="add-account-modal" isOpen={this.state.showModal} size="lg" toggle={this.toggleModal}>
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
            { accountButton }
            <Button color="secondary" onClick={this.toggleModal}>Close</Button>
          </div>
        </Modal>
      </div>
    )
  }
}
