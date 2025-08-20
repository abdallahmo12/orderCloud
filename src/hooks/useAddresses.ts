import { useShopper } from "@ordercloud/react-sdk";
import { Address, Me } from "ordercloud-javascript-sdk";
import { useEffect, useState } from "react";

const useAddresses = () => {
  const [listOfAddresses, setListOfAddresses] = useState<Address[]>([]);
  const { orderWorksheet } = useShopper();

  const getAddresses = async ()=> {
    if (!orderWorksheet?.Order?.ID) return;
      try {
        const listAddresses = await Me.ListAddresses();
        setListOfAddresses(listAddresses.Items || []);
      } catch (err) {
        console.error("Failed to get addresses:", err);
        setListOfAddresses([]);
      }
  }

  useEffect(() => {
    getAddresses();
  }, []);

  return listOfAddresses;
};

export default useAddresses;
