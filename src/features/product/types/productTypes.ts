export type ProductType = 'Prime' | 'Premium' | 'Select' | 'Choice' | 'Byproduct';

export type Product = {
  id: string;
  name: string;
  type: ProductType;
  unit: 'kg';
  price: number;
  stock?: number;
};
