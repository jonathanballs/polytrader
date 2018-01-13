import React from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types'
import {accountTypeDef, serviceTypeDef} from './propTypeDefinitions'
import axios from 'axios';

const propTypes = {
    account: accountTypeDef.isRequired,
    onSyncFinish: PropTypes.func,
}

export default class AccountSyncButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = { isSyncing: false }
        this.syncAccount = this.syncAccount.bind(this);
    }

    syncAccount() {
        this.setState({isSyncing: true})
        const url = `/account/api/accounts/${this.props.account._id}/sync`;
        axios.post(url).then((response) => {
            this.setState({isSyncing: false});
            if (this.props.onSyncFinish) {
                this.props.onSyncFinish();
            }
        });
    }

    render() {
        const iconSpin = this.state.isSyncing ? " fa-spin" : null;

        return (
            <button onClick={this.syncAccount}
                disabled={this.state.isSyncing}
                className="btn btn-secondary"
                aria-label="Left Align">

                <span className={"fa fa-refresh fa-lg" + iconSpin} aria-hidden="true"></span>
            </button>
        )
    }
}

AccountSyncButton.propTypes = propTypes;
