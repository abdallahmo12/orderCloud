import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Center,
  Container,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
  useToast,
  VStack,
  Select,
  FormControl,
  FormLabel,
  Box,
} from "@chakra-ui/react";
import {
  BuyerProduct,
  InventoryRecord,
  OrderCloudError,
  SpecOption,
  Products,
} from "ordercloud-javascript-sdk";
import pluralize from "pluralize";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IS_MULTI_LOCATION_INVENTORY } from "../../constants";
import formatPrice from "../../utils/formatPrice";
import OcQuantityInput from "../cart/OcQuantityInput";
import ProductImageGallery from "./product-detail/ProductImageGallery";
import {
  useOcResourceGet,
  useOcResourceList,
  useShopper,
} from "@ordercloud/react-sdk";
import { useQuery } from "@tanstack/react-query";
import ProductVariants from "./ProductVariants";

export interface ProductDetailProps {
  productId: string;
  renderProductDetail?: (product: BuyerProduct) => JSX.Element;
}

const ProductDetail: React.FC<ProductDetailProps> = ({
  productId,
  renderProductDetail,
}) => {

  // console.log("productId -------------------->  ", productId);
  const navigate = useNavigate();
  const toast = useToast();
  const [activeRecordId, setActiveRecordId] = useState<string>();
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});
  
  const { data: product, isLoading: loading, error: productError } = useOcResourceGet<BuyerProduct>(
    "Me.Products",
    { productID: productId }
  );

  console.log("product -------------------------> ", product);
  
  // Debug product loading
  useEffect(() => {
    // console.log("[ProductDetail] Product loading state:", { loading, productError, productId });
    if (productError) {
      // console.error("[ProductDetail] Product loading error:", productError);
    }
  }, [loading, productError, productId]);
  
  const { data: inventoryRecords } = useOcResourceList<InventoryRecord>(
    "Me.ProductInventoryRecords",
    undefined,
    { productID: productId },
    { disabled: !IS_MULTI_LOCATION_INVENTORY }
  );

  // Fetch product specifications using direct API call
  const specsQuery = useQuery({
    queryKey: ['specs', productId],
    queryFn: async () => {
      try {
        // Use the correct endpoint for product specs
        const specs = await Products.ListSpecs(productId)
        return specs
      } catch (error) {
        console.error('Error fetching specs:', error)
        throw error
      }
    },
    enabled: !!productId,
  })

  const { data: productSpecs, isLoading: specsLoading } = specsQuery;


   // Custom variants query using direct API call
  const variantsQuery = useQuery({
    queryKey: ['variants',productId],
    queryFn: async () => {
      try {
        // Use the correct endpoint for variants
        const variants = await Products.ListVariants(productId);
        return variants;
      } catch (error) {
        console.error('Error fetching variants:', error)
        throw error
      }
    },
    enabled: !!productId ,
  })

  const { data: variantsData, isLoading, error } = variantsQuery

  // Debug logging
  useEffect(() => {
    // console.log("[ProductDetail] Product data:", product);
    // console.log("[ProductDetail] Product specs (Products.ListSpecs):", productSpecs);
    // console.log("[ProductDetail] Product ID:", productId);
    // console.log("[ProductDetail] Product xp:", product?.xp);
    
    // Additional debugging for product structure
    if (product) {
      // console.log("[ProductDetail] Full product object keys:", Object.keys(product));
      // console.log("[ProductDetail] Product xp keys:", product.xp ? Object.keys(product.xp) : 'No xp');
      // console.log("[ProductDetail] Product VariantCount:", product.VariantCount);
      
      // Check for images in various locations
      // console.log("[ProductDetail] Checking for images...");
      // console.log("[ProductDetail] xp.Images:", product.xp?.Images);
      // console.log("[ProductDetail] xp.Image:", product.xp?.Image);
      // console.log("[ProductDetail] xp.ImageUrl:", product.xp?.ImageUrl);
      // console.log("[ProductDetail] xp.PrimaryImage:", product.xp?.PrimaryImage);
      // console.log("[ProductDetail] xp.MainImage:", product.xp?.MainImage);
      
      // Check main product object for images
      const productAny = product as Record<string, unknown>;
      // console.log("[ProductDetail] Product.Image:", productAny.Image);
      // console.log("[ProductDetail] Product.ImageURL:", productAny.ImageURL);
      // console.log("[ProductDetail] Product.PrimaryImage:", productAny.PrimaryImage);
      // console.log("[ProductDetail] Product.MainImage:", productAny.MainImage);
      
      // Search for any field containing 'image' or 'photo'
      const imageFields = Object.entries(productAny).filter(([key, value]) => 
        typeof value === 'string' && 
        (key.toLowerCase().includes('image') || key.toLowerCase().includes('photo')) &&
        (value.startsWith('http') || value.startsWith('/'))
      );
      console.log("[ProductDetail] Found image fields:", imageFields);
    }
  }, [product, productSpecs, productId]);

  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(
    product?.PriceSchedule?.MinQuantity ?? 1
  );
  const outOfStock = useMemo(
    () => product?.Inventory?.QuantityAvailable === 0,
    [product?.Inventory?.QuantityAvailable]
  );
  const { addCartLineItem } = useShopper();

  useEffect(() => {
    const availableRecord = inventoryRecords?.Items.find(
      (item) => item.QuantityAvailable > 0
    );
    if (availableRecord) {
      setActiveRecordId(availableRecord.ID);
    }
  }, [inventoryRecords?.Items]);

  // Get the actual specs to use from Products.ListSpecs
  const specsToUse = useMemo(() => {
    const specs = productSpecs?.Items || [];
    
    console.log("[ProductDetail] Specs from Products.ListSpecs:", {
      specsCount: specs.length,
      specs: specs
    });
    
    return specs;
  }, [productSpecs?.Items]);

  // Check if product has variants/specs
  const hasVariants = useMemo(() => {
    const hasSpecs = specsToUse.length > 0;
    const hasVariantCount = product?.VariantCount && product.VariantCount > 0;
    console.log("[ProductDetail] Variant detection:", { 
      hasSpecs, 
      hasVariantCount, 
      variantCount: product?.VariantCount,
      specsCount: specsToUse.length 
    });
    return hasSpecs || hasVariantCount;
  }, [specsToUse.length, product?.VariantCount]);

  // Initialize selected specs with default values
  useEffect(() => {
    if (specsToUse.length > 0) {
      console.log("[ProductDetail] Initializing specs with:", specsToUse);
      const initialSpecs: Record<string, string> = {};
      specsToUse.forEach((spec) => {
        // Only auto-select if there's exactly one option and it's required
        if (spec.Required && spec.Options && spec.Options.length === 1) {
          initialSpecs[spec.ID] = spec.Options[0].ID;
        }
      });
      setSelectedSpecs(initialSpecs);
      console.log("[ProductDetail] Initial specs set to:", initialSpecs);
    }
  }, [specsToUse]);

  const handleSpecChange = (specId: string, optionId: string) => {
    console.log("[ProductDetail] Spec changed:", specId, "to", optionId);
    setSelectedSpecs(prev => ({
      ...prev,
      [specId]: optionId
    }));
  };

  const validateRequiredSpecs = (): boolean => {
    if (!hasVariants) return true;
    
    const requiredSpecs = specsToUse.filter(spec => spec.Required);
    const isValid = requiredSpecs.every(spec => selectedSpecs[spec.ID]);
    console.log("[ProductDetail] Spec validation:", { 
      requiredSpecs: requiredSpecs.length, 
      selectedSpecs, 
      isValid,
      hasVariants 
    });
    return isValid;
  };

  const handleAddToCart = useCallback(async () => {
    if (!product) {
      console.warn("[ProductDetail.tsx] Product not found for ID:", productId);
      return;
    }

    if (IS_MULTI_LOCATION_INVENTORY && !activeRecordId) {
      toast({
        title: "No Inventory Available",
        description: "Please select a store with available inventory.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Validate required specifications only if product has variants
    if (hasVariants && !validateRequiredSpecs()) {
      toast({
        title: "Missing Required Specifications",
        description: "Please select all required product options before adding to cart.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setAddingToCart(true);
      
      // Build specs array for the line item only if we have specs
      const specs = specsToUse.length > 0 ? Object.entries(selectedSpecs).map(([specId, optionId]) => {
        const spec = specsToUse.find(s => s.ID === specId);
        const option = spec?.Options?.find(o => o.ID === optionId);
        return {
          SpecID: specId,
          OptionID: optionId,
          Value: option?.Value || '',
          Name: spec?.Name || ''
        };
      }) : undefined;

      console.log("[ProductDetail] Adding to cart with specs:", specs);

      await addCartLineItem({
        ProductID: productId,
        Quantity: quantity,
        InventoryRecordID: activeRecordId,
        Specs: specs,
      });
      
      setAddingToCart(false);
      toast({
        title: `${quantity} ${pluralize("item", quantity)} added to cart`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      navigate("/cart");
    } catch (error) {
      setAddingToCart(false);
      console.error("[ProductDetail] Error adding to cart:", error);
      
      if (error instanceof OrderCloudError) {
        toast({
          title: "Error adding to cart",
          description: error.message || "Please ensure all required specifications are filled out.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    }
  }, [product, activeRecordId, productId, toast, addCartLineItem, quantity, navigate, selectedSpecs, specsToUse, hasVariants]);

  // Enhanced image handling - try multiple possible image sources
  const getProductImages = () => {
    console.log("[ProductDetail] Getting product images for:", product?.ID);
    console.log("[ProductDetail] Product xp:", product?.xp);
    
    // Try xp.Images first (most common) - handle array of image objects
    if (product?.xp?.Images && Array.isArray(product.xp.Images)) {
      console.log("[ProductDetail] Found images in xp.Images:", product.xp.Images);
      // Map the image objects to the expected format
      const mappedImages = product.xp.Images.map((img: Record<string, string>) => ({
        Url: img.Url || img.url || '',
        ThumbnailUrl: img.ThumbnailUrl || img.thumbnailUrl || img.Url || img.url || ''
      }));
      console.log("[ProductDetail] Mapped images:", mappedImages);
      return mappedImages;
    }
    
    // Try xp.Images as a single object
    if (product?.xp?.Images && typeof product.xp.Images === 'object' && !Array.isArray(product.xp.Images)) {
      const images = product.xp.Images as Record<string, string>;
      if (images.Url || images.url) {
        console.log("[ProductDetail] Found image in xp.Images.Url:", images.Url || images.url);
        return [{ 
          Url: images.Url || images.url, 
          ThumbnailUrl: images.ThumbnailUrl || images.thumbnailUrl || images.Url || images.url 
        }];
      }
    }
    
    // Try other possible image locations in xp
    const xpImageFields = ['Image', 'ImageUrl', 'PrimaryImage', 'MainImage', 'Photo', 'PhotoUrl'];
    for (const field of xpImageFields) {
      if (product?.xp?.[field]) {
        console.log(`[ProductDetail] Found image in xp.${field}:`, product.xp[field]);
        return [{ Url: product.xp[field], ThumbnailUrl: product.xp[field] }];
      }
    }
    
    // Check if there are any images in the main product object (not xp)
    const productImageFields = ['Image', 'ImageURL', 'PrimaryImage', 'MainImage', 'Photo', 'PhotoURL'];
    for (const field of productImageFields) {
      const productAny = product as Record<string, unknown>;
      if (productAny?.[field]) {
        console.log(`[ProductDetail] Found image in ${field}:`, productAny[field]);
        return [{ Url: productAny[field] as string, ThumbnailUrl: productAny[field] as string }];
      }
    }
    
    // Try to find any field that contains 'image' or 'photo' in the product object
    if (product) {
      const productAny = product as Record<string, unknown>;
      for (const [key, value] of Object.entries(productAny)) {
        if (typeof value === 'string' && 
            (key.toLowerCase().includes('image') || key.toLowerCase().includes('photo')) &&
            (value.startsWith('http') || value.startsWith('/'))) {
          console.log(`[ProductDetail] Found image in ${key}:`, value);
          return [{ Url: value, ThumbnailUrl: value }];
        }
      }
    }
    
    console.log("[ProductDetail] No images found");
    return [];
  };

  return loading ? (
    <Center h="50vh">
      <Spinner size="xl" thickness="10px" />
    </Center>
  ) : product ? (
    renderProductDetail ? (
      renderProductDetail(product)
    ) : (
      <SimpleGrid
        as={Container}
        gridTemplateColumns={{ lg: "1.5fr 2fr" }}
        gap={12}
        w="full"
        maxW="container.4xl"
      >
        <ProductImageGallery images={getProductImages()} />
        <VStack alignItems="flex-start" maxW="4xl" gap={4}>
          <Heading maxW="2xl" size="xl">
            {product.Name}
          </Heading>
          <Text color="chakra-subtle-text" fontSize="sm">
            {product.ID}
          </Text>
          <Text maxW="prose">{product.Description}</Text>
          <Text fontSize="3xl" fontWeight="medium">
            {formatPrice(product?.PriceSchedule?.PriceBreaks?.[0].Price)}
          </Text>

          {/* Product Specifications */}
          {specsLoading ? (
            <Box w="full" my={4}>
              <Text>Loading product options...</Text>
            </Box>
          ) : hasVariants ? (
            <Box w="full" my={4}>
              <Heading size="md" mb={4}>Product Options</Heading>
              {specsToUse.length > 0 ? (
                <VStack spacing={4} align="stretch">
                  {specsToUse.map((spec) => (
                    <FormControl key={spec.ID} isRequired={spec.Required}>
                      <FormLabel fontSize="sm" fontWeight="medium">
                        {spec.Name}
                        {spec.Required && <Text as="span" color="red.500"> *</Text>}
                      </FormLabel>
                      <Select
                        placeholder={`Select ${spec.Name}`}
                        value={selectedSpecs[spec.ID] || ''}
                        onChange={(e) => handleSpecChange(spec.ID, e.target.value)}
                        size="sm"
                      >
                        {spec.Options?.map((option: SpecOption) => (
                          <option key={option.ID} value={option.ID}>
                            {option.Value}
                            {option.PriceMarkup && option.PriceMarkup !== 0 && 
                              ` (+${formatPrice(option.PriceMarkup)})`
                            }
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                  ))}
                </VStack>
              ) : (
                <Box w="full" my={4}>
                  <Text color="orange.500" fontSize="sm">
                    This product has {product?.VariantCount} variants available. Please contact customer service to select specific options.
                  </Text>
                </Box>
              )}
            </Box>
          ) : (
            <Box w="full" my={4}>
              <Text color="gray.500" fontSize="sm">
                No product options available
              </Text>
            </Box>
          )}

          <HStack alignItems="center" gap={4} my={3}>
            <Button
              colorScheme="primary"
              type="button"
              onClick={handleAddToCart}
              isDisabled={addingToCart || outOfStock}
            >
              {outOfStock ? "Out of stock" : "Add To Cart"}
            </Button>
            <OcQuantityInput
              controlId="addToCart"
              priceSchedule={product.PriceSchedule}
              quantity={quantity}
              onChange={setQuantity}
            />
          </HStack>
          
          {!outOfStock && IS_MULTI_LOCATION_INVENTORY && (
            <>
              <Heading size="sm" color="chakra-subtle-text">
                {`(${inventoryRecords?.Items.length}) locations with inventory`}
              </Heading>
              <HStack spacing={4}>
                {inventoryRecords?.Items.length &&
                  inventoryRecords?.Items.map((item) => (
                    <Button
                      onClick={() => setActiveRecordId(item.ID)}
                      cursor="pointer"
                      variant="outline"
                      as={Card}
                      h="150px"
                      aspectRatio="1 / 1"
                      key={item.ID}
                      isDisabled={item.QuantityAvailable === 0}
                    >
                      <CardBody
                        fontSize="xs"
                        p={1}
                        display="flex"
                        alignItems="flext-start"
                        justifyContent="center"
                        flexFlow="column nowrap"
                      >
                        <Text fontSize="sm">{item.Address.AddressName}</Text>
                        <Text>{item.Address.Street1}</Text>
                        {item.Address.Street2 && (
                          <Text>{item.Address.Street2}</Text>
                        )}
                        <Text>Stock: {item.QuantityAvailable}</Text>
                      </CardBody>
                      <CardFooter py={2} fontSize="xs">
                        {item.QuantityAvailable === 0
                          ? "Out of stock"
                          : "Select This Store"}
                      </CardFooter>
                    </Button>
                  ))}
              </HStack>
            </>
          )}
        </VStack>
        <ProductVariants Items={variantsData?.Items || []} product={product}/>
      </SimpleGrid>
    )
  ) : (
    <div>Product not found for ID: {productId}</div>
  );
};

export default ProductDetail;
