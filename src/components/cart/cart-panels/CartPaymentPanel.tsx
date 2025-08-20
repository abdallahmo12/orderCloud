import { Button, Radio, RadioGroup, Stack } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { PAYMENT_PROVIDER, PAYMENT_PROVIDERS } from "../../../constants";
import { BlueSnap } from "../Payment/BlueSnap";
import { CardConnect } from "../Payment/CardConnect";
import { PayPal } from "../Payment/PayPal";
import { Stripe } from "../Payment/Stripe";
import PaymentMethod from "../Payment/PaymentMethod";

type CartPaymentPanelProps = {
  submitOrder: () => void;
  submitting: boolean;
  Calculate: (creditCardID: string) => void;
};

const PaymentMapper = (provider: PAYMENT_PROVIDERS) => {
  switch (provider) {
    case PAYMENT_PROVIDERS.STRIPE:
      return <Stripe />;
    case PAYMENT_PROVIDERS.CARD_CONNECT:
      return <CardConnect />;
    case PAYMENT_PROVIDERS.BLUESNAP:
      return <BlueSnap />;
    case PAYMENT_PROVIDERS.PAYPAL:
      return <PayPal />;
    default:
      null;
  }
};

export const CartPaymentPanel = ({
  submitOrder,
  submitting,
  Calculate
}: CartPaymentPanelProps) => {
  const [selectedProvider, setSelectedProvider] = useState("CreditCard");

  // console.log("Selected Payment Provider:", selectedProvider);
  return (
    <>
      <RadioGroup
        defaultValue={"CreditCard"}
        onChange={val => setSelectedProvider(val)}
        mb={4}
      >
        <Stack direction="row">
          <Radio value={"CreditCard"}>CreditCard</Radio>
          <Radio value={"Cash"}>Cash</Radio>
        </Stack>
      </RadioGroup>

      {selectedProvider === "CreditCard" && (
        <PaymentMethod submitOrder={submitOrder} submitting={submitting} Calculate={Calculate} />)}
    </>
  );
};
