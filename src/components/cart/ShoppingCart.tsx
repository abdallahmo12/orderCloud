import {
  Button,
  Center,
  Container,
  Grid,
  GridItem,
  Heading,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useShopper } from "@ordercloud/react-sdk";
import { Address, IntegrationEvents, Me, Payments, PaymentType } from "ordercloud-javascript-sdk";
import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { CartInformationPanel } from "./cart-panels/CartInformationPanel";
import { CartPaymentPanel } from "./cart-panels/CartPaymentPanel";
import CartShippingPanel from "./cart-panels/CartShippingPanel";
import CartSkeleton from "./ShoppingCartSkeleton";
import CartSummary from "./ShoppingCartSummary";
import useAppendAddresses from "../../hooks/useAppendAddress";
import { ca } from "date-fns/locale/ca";

export const TABS = {
  INFORMATION: 0,
  SHIPPING: 1,
  PAYMENT: 2,
};

export const ShoppingCart = (): JSX.Element => {
  const [submitting, setSubmitting] = useState(false);
  const [tabIndex, setTabIndex] = useState(TABS.INFORMATION);
  const [isAppendAddress, setIsAppendAddress] = useState(false);

  const {
    orderWorksheet,
    worksheetLoading,
    deleteCart,
    submitCart
  } = useShopper();



  const [shippingAddress, setShippingAddress] = useState<Address>({
    FirstName: "",
    LastName: "",
    CompanyName: "",
    Street1: "",
    Street2: "",
    City: "",
    State: "",
    Zip: "",
    Country: "US",
    Phone: "",
  });

  const navigate = useNavigate();
  const toast = useToast();
  const orderID = orderWorksheet?.Order?.ID;

  useEffect(() => {
    console.log("tabIndex:", tabIndex);
    (orderID && tabIndex == 2) && calculateTheOrder(orderID || "");
  }, [tabIndex, orderID]);

  useAppendAddresses(shippingAddress, isAppendAddress, setIsAppendAddress);
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
      if (!paymentMethodID) {
        throw new Error("paymentMethodID is undefined");
      }
      const newTransaction = await Payments.Patch("All", orderWorksheet.Order.ID, paymentMethodID, transaction);
      console.log("Transaction created:", newTransaction);
    } catch (err) {
      console.error("Failed to create transaction:", err);
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
  const Calculate = async (creditCardID: string) => {
    console.log("CreditCardID : --------------->", creditCardID);
    try {
      if (creditCardID) {
        const paymentMethodID = await getPaymentsForOrder(orderID || "");
        console.log("Payment ID -------From SubmitOrder ------->", paymentMethodID);
        if (!paymentMethodID) {
          console.error("No payment method found for the order.");
          // creating payment method
          const paymentMethod = await createPaymentMethod(creditCardID);
          // creating transaction
          createTrasaction(paymentMethod?.ID);
          // return;
        }
      }
      calculateTheOrder(orderID || "");
    } catch (err) {
      console.error("Error Calculating order:", err);
      toast({
        title: "Error submitting order",
        description:
          "There was an issue calculating your order. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }


  const submitOrder = async () => {
    // const orderID = orderWorksheet?.Order?.ID;
    setSubmitting(true);
    if (!orderWorksheet?.Order?.ID) return;
    try {
      await submitCart();
      setSubmitting(false);
      navigate(`/order-confirmation?orderID=${orderWorksheet.Order.ID}`);
    } catch (err) {
      console.error("Error submitting order:", err);
      setSubmitting(false);
      toast({
        title: "Error submitting order",
        description:
          "There was an issue submitting your order. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }

  const deleteOrder = useCallback(async () => {
    if (!orderWorksheet?.Order?.ID) return;
    await deleteCart();
  }, [deleteCart, orderWorksheet?.Order?.ID]);

  const handleNextTab = () => {
    setTabIndex((prevIndex) =>
      Math.min(prevIndex + 1, Object.keys(TABS).length - 1)
    );
  };

  const handlePrevTab = () => {
    setTabIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleTabChange = (index: number) => {
    setTabIndex(index);
  };

  const handleSaveShippingAddress = async () => {
    if (!orderWorksheet?.Order?.ID) return;

    try {
      // adding shipping address to the order
      setIsAppendAddress(true);
      // const res1 = await setShippingAddress(shippingAddress);
      // const res2 = await estimateShipping();
    } catch (err) {
      console.error("Failed to save shipping address:", err);
    }
    handleNextTab();
  };

  return (
    <>
      {worksheetLoading ? (
        <CartSkeleton />
      ) : (
        <>
          {orderWorksheet?.Order &&
            orderWorksheet?.LineItems &&
            orderWorksheet?.LineItems?.length ? (
            <>
              {submitting && (
                <Center
                  boxSize="full"
                  h="100vh"
                  position="absolute"
                  zIndex={1234}
                  background="whiteAlpha.400"
                >
                  <VStack>
                    <Spinner
                      label="submitting order..."
                      thickness="10px"
                      speed=".5s"
                      color="gray.300"
                      opacity=".9"
                      size="xl"
                      zIndex={1235}
                    />
                    <Text color="gray.500">Submitting order...</Text>
                  </VStack>
                </Center>
              )}
              <Grid
                gridTemplateColumns={{ md: "3fr 2fr" }}
                w="full"
                justifyItems="stretch"
                flex="1"
              >
                <GridItem alignSelf="flex-end" h="full">
                  <Container
                    maxW="container.lg"
                    mx="0"
                    ml="auto"
                    p={{ base: 6, lg: 12 }}
                  >
                    <Heading mb={6}>Checkout</Heading>

                    <Tabs
                      size="sm"
                      index={tabIndex}
                      onChange={handleTabChange}
                      variant="soft-rounded"
                    >
                      <TabList>
                        <Tab>Information</Tab>
                        <Tab>Shipping</Tab>
                        <Tab>Payment</Tab>
                      </TabList>

                      <TabPanels>
                        <TabPanel>
                          <CartInformationPanel
                            shippingAddress={shippingAddress}
                            setShippingAddress={setShippingAddress}
                            handleNextTab={handleNextTab}
                            handleSaveShippingAddress={
                              handleSaveShippingAddress
                            }
                          />
                        </TabPanel>
                        <TabPanel>
                          <CartShippingPanel
                            shippingAddress={shippingAddress}
                            handleNextTab={handleNextTab}
                            handlePrevTab={handlePrevTab}
                          />
                        </TabPanel>

                        <TabPanel display="flex" flexDirection="column">
                          <CartPaymentPanel
                            submitOrder={submitOrder}
                            submitting={submitting}
                            Calculate={Calculate}
                          />
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                  </Container>
                </GridItem>

                <GridItem bgColor="blackAlpha.100" h="full">
                  <Container
                    maxW="container.sm"
                    mx="0"
                    mr="auto"
                    p={{ base: 6, lg: 12 }}
                  >
                    {worksheetLoading ? (
                      <Spinner />
                    ) : (
                      <CartSummary
                        deleteOrder={deleteOrder}
                        onSubmitOrder={submitOrder}
                        tabIndex={tabIndex}
                      />
                    )}
                  </Container>
                </GridItem>
              </Grid>
            </>
          ) : (
            <Center flex="1">
              <VStack mt={-28}>
                <Heading>Cart is empty</Heading>
                <Button as={RouterLink} size="sm" to="/products">
                  Continue shopping
                </Button>
              </VStack>
            </Center>
          )}
        </>
      )}
    </>
  );
};

export default ShoppingCart;
