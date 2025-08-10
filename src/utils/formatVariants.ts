export default  function formatVariants(Items : Array<{ ID: string; Specs: Array<{ Name: string; Value: string }> , xp:{Price : number} }> , product : any = {}) {
          const arr : {ID : string , Color : string , Size : string ,xp ?: {Price?: number | null}}[] = [];
          console.log("Items ------------------------> ", Items);
        Items.forEach((item : {xp?: {Price : number} ,  ID: string; Specs: Array<{ Name: string; Value: string }> }) => {
        const obj: { ID: string; Color: string; Size: string , xp : {Price?: number | null}} = {
          ID: item.ID,
          Color: "",
          Size: "", 
          xp : {
            ...product.xp, // Spread the xp from the product if it exists
            ...item.xp, // Spread the xp from the item if it exists
          }
          
        };

        if((item.xp && item.xp.Price) || product.xp?.Price) {
            obj.xp.Price = item.xp?.Price || product.xp?.Price; // Ensure Price is set if it exists in either item or product
        }
      if (item?.Specs && item.Specs.length) {
        item.Specs.forEach((spec: { Name: string; Value: string }) => {
          if (spec.Name === "Color") {
            obj.Color = spec.Value || "";
          }
          if (spec.Name === "Size") {
            obj.Size = spec.Value || "";
          }
        });
      }
      arr.push(obj);
    }); 
    return arr;
}