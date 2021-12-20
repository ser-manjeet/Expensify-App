import React from 'react';
import {withOnyx} from 'react-native-onyx';
import CONST from '../CONST';
import Navigation from '../libs/Navigation/Navigation';
import AddPaymentMethodMenu from './AddPaymentMethodMenu';
import getClickedElementLocation from '../libs/getClickedElementLocation';
import * as PaymentUtils from '../libs/PaymentUtils';
import * as PaymentMethods from '../libs/actions/PaymentMethods';
import ONYXKEYS from '../ONYXKEYS';
import userWalletPropTypes from '../pages/EnablePayments/userWalletPropTypes';

const propTypes = {
    ...userWalletPropTypes,
};

const defaultProps = {
    userWallet: {},
};

// This component allows us to block various actions by forcing the user to first add a default payment method and successfully make it through our Know Your Customer flow
// before continuing to take whatever action they originall intended to take. It requires a button as a child and a native event so we can get the coordinates and use it
// to render the AddPaymentMethodMenu in the correct location.

class KYCWall extends React.Component {
    constructor(props) {
        super(props);

        this.triggerKYCFlow = this.triggerKYCFlow.bind(this);

        this.state = {
            shouldShowAddPaymentMenu: false,
            anchorPositionTop: 0,
            anchorPositionLeft: 0,
        };
    }

    componentDidMount() {
        // We are setting a callback here so that we can "continue" the original action the user wants to take
        // after they add a payment method and successfully go through KYC checks.
        PaymentMethods.setSetupAction(this.triggerKYCFlow);
    }

    componentWillUnmount() {
        PaymentMethods.setSetupAction(null);
    }

    triggerKYCFlow(event) {
        // Check to see if user has a valid payment method on file and display the add payment popover if they don't
        if (!PaymentUtils.hasExpensifyPaymentMethod(this.props.cardList, this.props.bankAccountList)) {
            const position = getClickedElementLocation(event.nativeEvent);
            this.setState({
                shouldShowAddPaymentMenu: true,
                anchorPositionTop: position.bottom - 226,
                anchorPositionLeft: position.right - 356,
            });
            return;
        }

        // Ask the user to upgrade to a gold wallet as this means they have not yet went through our Know Your Customer (KYC) checks
        const hasGoldWallet = this.props.userWallet.tierName && this.props.userWallet.tierName === CONST.WALLET.TIER_NAME.GOLD;
        if (!hasGoldWallet) {
            Navigation.navigate(this.props.enablePaymentsRoute);
            return;
        }

        this.props.onSuccessfulKYC(CONST.IOU.PAYMENT_TYPE.EXPENSIFY);
    }

    render() {
        return (
            <>
                <AddPaymentMethodMenu
                    isVisible={this.state.shouldShowAddPaymentMenu}
                    onClose={() => this.setState({shouldShowAddPaymentMenu: false})}
                    anchorPosition={{
                        top: this.state.anchorPositionTop,
                        left: this.state.anchorPositionLeft,
                    }}
                    shouldShowPaypal={false}
                    onItemSelected={(item) => {
                        this.setState({shouldShowAddPaymentMenu: false});
                        if (item === CONST.PAYMENT_METHODS.BANK_ACCOUNT) {
                            Navigation.navigate(this.props.addBankAccountRoute);
                        } else if (item === CONST.PAYMENT_METHODS.DEBIT_CARD) {
                            Navigation.navigate(this.props.addDebitCardRoute);
                        }
                    }}
                />
                {this.props.children(this.triggerKYCFlow)}
            </>
        );
    }
}

KYCWall.propTypes = propTypes;
KYCWall.defaultProps = defaultProps;

export default withOnyx({
    userWallet: {
        key: ONYXKEYS.USER_WALLET,
    },
    cardList: {
        key: ONYXKEYS.CARD_LIST,
    },
    bankAccountList: {
        key: ONYXKEYS.BANK_ACCOUNT_LIST,
    },
})(KYCWall);
