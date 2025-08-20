// ...existing imports...
import { Button, FormControl, FormLabel, Input, Select, Stack, Switch } from "@chakra-ui/react";
import { BuyerCreditCard, Me, RequiredDeep } from "ordercloud-javascript-sdk";
import { useEffect, useState } from "react";
import { useShopper } from "@ordercloud/react-sdk";

// ...existing code...

interface PaymentMethodProps {
  submitOrder: (creditCardID: string) => void;
  submitting: boolean;
  Calculate: (creditCardID: string) => void;
}

const PaymentMethod = ({ submitOrder, submitting , Calculate }: PaymentMethodProps) => {

  const { orderWorksheet } = useShopper();
  const [paymentFields, setPaymentFields] = useState({
    ID: "",
    Type: "CreditCard",
    CreditCardID: "",
    SpendingAccountID: "",
    Description: "Payment for Bill's Order",
    Amount: "",
    Accepted: false,
    xp: {},
  });
  const [creditCardList , setCreditCardList] = useState<RequiredDeep<BuyerCreditCard>[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPaymentFields(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const CreditCardsList = async () => {
    if (! orderWorksheet?.Order?.ID) return;
    try {
      const creditCards = await Me.ListCreditCards();
      setCreditCardList(creditCards?.Items || []);
      console.log("Credit Cards: ----->", creditCards);
      // Handle the list of credit cards as needed
    } catch (err) {
      setCreditCardList([]);
      console.error("Failed to fetch credit cards:", err);
    }
  }

  useEffect(() => {
    CreditCardsList();
  }, []);

  return (
    <>
      <Stack spacing={4}>
        <FormControl>
          <FormLabel>ID</FormLabel>
          <Input name="ID" value={orderWorksheet?.Order?.ID+'_payment'} onChange={handleChange} readOnly />
        </FormControl>
        <FormControl>
          <FormLabel>Type</FormLabel>
          <Input name="Type" value={paymentFields.Type} onChange={handleChange} isDisabled/>
        </FormControl>
        <FormControl>
          <FormLabel>CreditCardID</FormLabel>
          <Select
            name="CreditCardID"
            value={paymentFields.CreditCardID}
            onChange={handleChange}
            placeholder="Select credit card"
          >
            {creditCardList.map(card => (
              <option key={card.ID} value={card.ID}>
                {card.CardholderName} - {card.PartialAccountNumber}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>SpendingAccountID</FormLabel>
          <Input name="SpendingAccountID" value={paymentFields.SpendingAccountID} onChange={handleChange} />
        </FormControl>
        <FormControl>
          <FormLabel>Description</FormLabel>
          <Input name="Description" value={paymentFields.Description} onChange={handleChange} />
        </FormControl>
        <FormControl>
          <FormLabel>Amount</FormLabel>
          <Input name="Amount" value={orderWorksheet?.Order?.Total || paymentFields.Amount} onChange={handleChange} type="number" isDisabled/>
        </FormControl>
        <FormControl>
          <FormLabel>Accepted</FormLabel>
          <Switch
          id="Accepted"
          name="Accepted"
          isChecked={paymentFields.Accepted}
          onChange={e =>
            setPaymentFields(prev => ({
              ...prev,
              Accepted: e.target.checked,
            }))
          }
          isDisabled
        />
        </FormControl>
      </Stack>
      <Button
        alignSelf="flex-end"
        onClick={() => Calculate(paymentFields.CreditCardID)}
        mt={6}
        isDisabled={paymentFields.CreditCardID === ""}
      >
        Calculate
      </Button>
      <Button
        alignSelf="flex-end"
        onClick={() => submitOrder(paymentFields.CreditCardID)}
        mt={6}
        isDisabled={submitting}
      >
        {submitting ? "Submitting" : "Submit Order"}
      </Button>

      {/* ...existing RadioGroup and Button code... */}
    </>
  );
};

export default PaymentMethod;