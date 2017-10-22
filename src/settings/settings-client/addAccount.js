import React from 'react'
import { render } from 'react-dom'
import PropTypes from 'prop-types'
import { Modal, Button, Carousel, CarouselItem } from 'reactstrap'

export default class AddAccount extends React.Component {
  constructor(props) {
    super(props)
    this.state = { showModal: false, activeSlide: 0, accountFormSlide: <div key="2" /> }
  }

  accountForms = [
    {
      service: 'poloniex',
      formFields: [{
        name: 'apiKey', description: 'API Key'
      }, { name: 'apiSecret', description: 'API Secret' },]
    },
    {
      service: 'bittrex',
      formFields: [{
        name: 'apiKey', description: 'API Key'
      }, { name: 'apiSecret', description: 'API Secret' },]
    },
    {
      service: 'ethereum wallet',
      formFields: [{ name: 'walletAddress', description: 'Wallet Address' }]
    }
  ]


  toggle = () => {
    this.setState((prev, props) => Object.assign(prev, { showModal: !prev.showModal }))
  }

  // Displays an account form in the modal
  displayAccountForm = (account) => {
    var accountFormDesc = this.accountForms.filter(a => a.service == account)[0]
    var accountForm = accountFormDesc.formFields.map((ff, i) => {
      return (
      <div key={i} className="form-group row">
        <label className="col-md-2 col-form-label" htmlFor={ff.name}>{ff.description}</label>
        <div className="col-md-10">
          <input className="form-control" id="poloniexApiKey" type="text" name={ff.name} required />
        </div>
      </div>
      )
    })
    this.setState({activeSlide: 1, accountFormSlide: <div key="2">{accountForm}</div>})
  }

  render() {
    var slides = [<CarouselItem key='1' src=''>
      <div>
        {
          this.accountForms.map((form, i) => {
            return (<div key={i} className="col-md-12 account-type-selection">
              <Button block={true} size="lg" color="light"
                onClick={()=>{this.displayAccountForm(form.service)}}>{form.service}</Button>
            </div>)
          })
        }
      </div>
    </CarouselItem>,
    <CarouselItem key='2' src=''>
      {this.state.accountFormSlide}
    </CarouselItem>
    ]

    return (
      <div className="col-md-1" style={{ padding: 0 }}>
        <Button block={true} onClick={this.toggle}>Add</Button>

        <Modal className="add-account-modal" isOpen={this.state.showModal} size="lg" toggle={this.toggle}>
          <div className="modal-header">
            <h2 className="modal-title">Add Account</h2>
          </div>
          <div className="modal-body">

            <Carousel activeIndex={this.state.activeSlide} previous={() => {}} next={() => { }}>
              {slides}
            </Carousel>

          </div>
          <div className="modal-footer">
            {
              this.state.activeSlide == 1 ? <Button color="primary">Add Account</Button> : null
            }
            <Button color="secondary" onClick={this.toggle}>Close</Button>
          </div>
        </Modal>
      </div>
    )
  }
}
