import { Box, SimpleGrid ,Text} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import formatVariants from '../../utils/formatVariants';

export default function ProductVariants({Items , product}: {Items: Array<{ ID: string; Specs: Array<{ Name: string; Value: string }> , xp: {Price : number} }> , product?: any}) {
    const [variantsData, setVariantsData] = useState<{ID: string; Color: string; Size: string , xp ?: {Price ?: number | null}}[]>([]);
    useEffect(() => {
        setVariantsData(formatVariants(Items , product));
        console.log("Formatted Variants Data ------------------------> ", formatVariants(Items));
    }, [Items , product]);
  return (
    <Box>
        <Text fontWeight="bold" mb={2}>
          Variants List
        </Text>
        <SimpleGrid columns={[1, 2, 3]} spacing={4}>
          {variantsData && variantsData.length ?  variantsData.map((variant) => (
            <Box key={variant.ID}>
              {/* 
                ProductCard expects a BuyerProduct object.
                If you want to show only ID, Color, Size, you may need to create a VariantCard component.
                For demo, let's pass a minimal product object:
              */}
              <ProductCard product={{
                ...product,
                xp:{
                    ...product.xp,
                    ...variant.xp
                },
                ID: product.ID,
                Name: `${product.Name} ${variant.Color ?? ''} ${variant.Size ?? ''}`
              }} isVariant={true} />
            </Box>
          )) : (
            <Text textAlign="center" w="full">
              No specifications available
            </Text>
          )}
        </SimpleGrid>
      </Box>
  )
}
