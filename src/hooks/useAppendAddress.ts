import { useShopper } from "@ordercloud/react-sdk";
import { Address, Me } from "ordercloud-javascript-sdk";
import { useEffect, useState } from "react";

const useAppendAddresses = (addressObj: Partial<Address> , isAppendAddress: boolean , setIsAppendAddress : (appended : boolean ) => void ) => {
  const [isCreatedAddress , setIsCreatedAddress] = useState<boolean>(false);
  const [createdAddress , setCreatedAddress] = useState<Address | null>(null);
  const { orderWorksheet } = useShopper();

  const postAddresses = async (addressObj: Partial<Address>) => {
    if (!orderWorksheet?.Order?.ID) return;
    try {
      const ctdAddress = await Me.CreateAddress({
        ...addressObj,
        AddressName: addressObj.Street1,
        Editable: true,
        Shipping: true,
        Billing: true,
        DateCreated: new Date().toISOString(),
      });
      console.log("Address created successfully:", ctdAddress);
      setIsCreatedAddress(true);
      setCreatedAddress(ctdAddress);
    } catch (err) {
      console.error("Failed to get addresses:", err);
      setIsCreatedAddress(false);
    }
  };

  useEffect(() => {
    isAppendAddress && postAddresses(addressObj);
    setIsAppendAddress(false);
    
  }, [isAppendAddress]);

  return {isCreatedAddress, createdAddress};
};

export default useAppendAddresses;
