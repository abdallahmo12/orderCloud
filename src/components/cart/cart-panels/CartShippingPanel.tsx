import {
  Button,
  Card,
  CardBody,
  Select,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useShopper } from "@ordercloud/react-sdk";
import {
  Address,
  Me,
  Payments,
  Orders,
  PaymentType,
  IntegrationEvents
} from "ordercloud-javascript-sdk";
import React, { useEffect, useRef, useState } from "react";

interface CartShippingPanelProps {
  shippingAddress: Address;
  handleNextTab: () => void;
  handlePrevTab: () => void;
}

const CartShippingPanel: React.FC<CartShippingPanelProps> = ({
  handleNextTab,
}) => {
  const { orderWorksheet } = useShopper();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [listOfAddresses , setListOfAddresses] = useState<Address[]>([]);

  const shippingRef = useRef<HTMLSelectElement>(null);
  const billingRef = useRef<HTMLSelectElement>(null);


  const displaySelectsValues = () => {
    const shippingSelect = shippingRef.current;
    const billingSelect = billingRef.current;

    if (shippingSelect && billingSelect) {
      console.log("Shipping Select Value: ", shippingSelect.value);
      console.log("Billing Select Value: ", billingSelect.value);
    } else {
      console.error("Refs not set correctly");
    }
  };

  const createPersonalCeditCard = async () => {
    if (!orderWorksheet?.Order?.ID) return;
    try {
      const creditCard = {
        "ID": "MY_PERSONAL_CARD_ID",
        "Token": "",
        "CardType": "Visa",
        "PartialAccountNumber": "4245",
        "CardholderName": "Bill Test",
        "ExpirationDate": "2024-01-01T00:00:00-06:00",
        "xp": {}
      };
      const newCard = await Me.CreateCreditCard(creditCard);
      console.log("Credit card created:", newCard);
      return newCard;
    } catch (err) {
      console.error("Failed to create credit card:", err);
    }
  };

  const createPaymentMethod = async (credit_card_id: string) => {
    if (!orderWorksheet?.Order?.ID) return;
    try {
      const payment = {
        ID: `${orderWorksheet.Order.ID}_payment`,
        Type: "CreditCard" as PaymentType,
        CreditCardID: credit_card_id,
        Description: "Payment for Bill's Order",
        Amount: orderWorksheet.Order.Total || 0,
        Accepted: false,
        xp: {}
      };
      const newPaymentMethod = await Payments.Create("All", orderWorksheet.Order.ID, payment);
      console.log("Payment method created:", newPaymentMethod);
      return newPaymentMethod;
    } catch (err) {
      console.error("Failed to create payment method:", err);
    }
  };

  const createTrasaction = async (paymentMethodID: string | undefined) => {
    if (!orderWorksheet?.Order?.ID) return;
    try {
      const transaction = {
        ID: `${orderWorksheet.Order.ID}_payment`,
        Amount: orderWorksheet.Order.Total || 0,
        Accepted: true,
        xp: {
          method: 'Visa'
        },
        Transactions: [
          {
            ID: `${orderWorksheet.Order.ID}_transaction`,
            Type: 'CreditCard',
            TransactionType: 'Credit', // أو Authorization أو Credit
            Amount: orderWorksheet.Order.Total || 0,
            DateExecuted: new Date().toISOString(),

            xp: {
              processor: 'Stripe',
              referenceNumber: 'txn_7890'
            }
          }
        ]
      };
      const newTransaction = await Payments.Patch("All", orderWorksheet.Order.ID, paymentMethodID, transaction);
      console.log("Transaction created:", newTransaction);
    } catch (err) {
      console.error("Failed to create transaction:", err);
    }
  };

  const setShippingAndBilling = async () => {
    if (!orderWorksheet?.Order?.ID) return;
    try {
      const getOrder = await Orders.Get("All", orderWorksheet.Order.ID);
      console.log("Order details:", getOrder);
      const updatedOrder = await Orders.Patch("All", orderWorksheet.Order.ID, {
        ShippingAddressID: "northeast",
        BillingAddressID: "northeast",
      });
      console.log("Shipping and billing address updated:", updatedOrder);
    } catch (err) {
      console.error("Failed to update shipping and billing address:", err);
    }
  };

  const calculateTheOrder = async (orderID: string) => {
    try {
      const result = await IntegrationEvents.Calculate('All', orderID);
      console.log('Calculated order:', result);
      return result;
    } catch (error) {
      console.error('Error calculating order:', error);
      throw error;
    }
  };

  const getPaymentsForOrder = async (orderID: string) => {
    const res = await Payments.List('All', orderID);

    console.log('Payments:', res.Items);

    if (res.Items.length > 0) {
      console.log('First Payment ID:', res.Items[0].ID);
      return res.Items[0].ID;
    } else {
      console.log('No payments found for this order.');
      return null;
    }
  };

  const getAddesses = async () => {
    if (!orderWorksheet?.Order?.ID) return;
    try {
      const listAddresses = await Me.ListAddresses();
      console.log("List Address:", listAddresses);
      setListOfAddresses(listAddresses.Items || []);
    } catch (err) {
      console.error("Failed to get addresses:", err);
    }
  };

  useEffect(() => {
    console.log("continue to shipping triggered");
    getAddesses()
    displaySelectsValues();
  }, []);


  const handleSelectShipMethod = async () => {
    const orderID = orderWorksheet?.Order?.ID;
    // setting shipping and billing address
    setShippingAndBilling();
    // creating personal credit card
    const creditCard = await createPersonalCeditCard();
    if (creditCard?.ID) {
      const paymentMethodID = await getPaymentsForOrder(orderID || "");
      console.log("Payment ID -------------------->", paymentMethodID);
      if (!paymentMethodID) {
        console.error("No payment method found for the order.");
        // creating payment method
        const paymentMethod = await createPaymentMethod(creditCard.ID);
        // creating transaction
        createTrasaction(paymentMethod?.ID);
        return;
      }
    }
    calculateTheOrder(orderID || "");

    try {
      setLoading(true);
      handleNextTab();
    } catch (err) {
      console.error("Failed to select shipping method:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardBody display="flex" alignItems="center">
          <Spinner mr="3" />
          <Text display="inline">Loading...</Text>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          Shipping service unavailable, please contact your site admin and try
          again later
        </CardBody>
      </Card>
    );
  }

  return (
    <VStack alignItems="stretch" spacing={4} as="form" width="100%" w={"full"}>
      <Card>
        <CardBody>
          <VStack align="start" spacing={4}>
            <VStack align="start">
              <Text fontWeight="bold">Shipping Address</Text>
              <Select ref = {shippingRef} id = "shipping" defaultValue="" onChange={displaySelectsValues} >
                {listOfAddresses.map((address) => (
                  <option key={address.ID} value={address.ID}>
                    {address.AddressName}
                  </option>
                ))}
                <option value="messi">Messi</option>
                <option value="Lamine">Lamine Yamal</option>
              </Select>
            </VStack>
            <VStack align="start">
              <Text fontWeight="bold">Billing Address</Text>
              <Select ref = {billingRef} id = "billing" defaultValue="" onChange={displaySelectsValues}>
                {listOfAddresses.map((address) => (
                  <option key={address.ID} value={address.ID}>
                    {address.AddressName}
                  </option>
                ))}
                <option value="messi">Messi</option>
                <option value="Lamine">Lamine Yamal</option>
              </Select>
            </VStack>
          </VStack>
        </CardBody>
      </Card>
      <Button
        alignSelf="flex-end"
        mt={6}
        onClick={handleSelectShipMethod}
      >
        {loading ? <Spinner size="sm" /> : "Continue to payment"}
      </Button>
    </VStack>
  );
};

export default CartShippingPanel;
