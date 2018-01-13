import React from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types'
import moment from 'moment'
import EditAccountButton from './editAccountButton'
import {accountTypeDef, serviceTypeDef} from './propTypeDefinitions'
import AccountSyncButton from './accountSyncButton'

const propTypes = {
    updateAccountList: PropTypes.func,
    formValues: PropTypes.object,
    onSync: PropTypes.func,
    account: accountTypeDef.isRequired,
    service: serviceTypeDef.isRequired,
}

export default class Account extends React.Component {
    makeRow(title, content) {
        return (
            <div className="row" key={title}>
                <div className="col-4 col-sm-3 col-lg-2 exchange-property">{title}</div>
                <div className="col-8 col-sm-9 col-lg-10 exchange-property-val">{content}</div>
            </div>

        )
    }

    render() {

        const service = this.props.service;
        const account = this.props.account;

        var userVariables = service.formFields.map(ff => {
            var varValue

            if (ff.name.toLowerCase().includes("secret")) {
                varValue = "*******************************************************************************"
            }
            else if (ff.type == 'file') {
                varValue = account.userAuth[ff.name].originalFilename
            }
            else {
                varValue = account.userAuth[ff.name]
            }

            return this.makeRow(ff.description, varValue)
        })

        var syncStatus = null
        if (account.timestampLastSync == null) {
            syncStatus = <span className="badge badge-info">Never synced</span>
        }
        else if (account.lastSyncWasSuccessful === true) {
            syncStatus = <span title={account.timestampLastSync} className="badge badge-success">
                {moment(account.timestampLastSync).fromNow()}
            </span>
        }
        else {
            syncStatus = <span className="badge badge-danger" title={account.timestampLastSync}>
                Failed {moment(account.timestampLastSync).fromNow()} - {
                    account.lastSyncErrorMessage
                        ? account.lastSyncErrorMessage
                        : "Failed for unknown reason"
                }
            </span>
        }

        return (
            <div className="exchange-settings">
                <div className="row">
                    <div className="col-8 col-sm-9 col-lg-10">
                        <img className="exchange-logo" src={"/static/images/exchange-logos/" + service.key + ".png"} />
                    </div>
                    <div className="col-4 col-sm-3 col-lg-2">
                        <div className="btn-group account-action-buttons" style={{width: "100%"}}>
                            <AccountSyncButton
                                account={account}
                                onSyncFinish={this.props.updateAccountList}/>
                            <EditAccountButton
                                service={service}
                                errorMessage=""
                                formValues={account.userAuth}
                                accountID={account._id}
                                onSubmitted={this.props.updateAccountList} />
                        </div>
                    </div>
                </div>
                {userVariables}
                {this.makeRow('Added', <span title={this.props.account.timestampCreated}>
                    {moment(this.props.account.timestampCreated).fromNow()}
                </span>)}
                {this.makeRow('Syncronisation', syncStatus)}
            </div>
        )
    }
}


Account.propTypes = propTypes;