export interface CategoryField {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'select';
  options?: string[];
}

export const CATEGORY_SPEC_FIELDS: Record<string, CategoryField[]> = {
  Vehicles: [
    { key: 'Brand', label: 'Brand', placeholder: 'e.g. Toyota, Yamaha' },
    { key: 'Model', label: 'Model', placeholder: 'e.g. Corolla Axio, FZS V3' },
    { key: 'Year of Manufacture', label: 'Year of Manufacture', placeholder: 'e.g. 2018' },
    { key: 'Registration Year', label: 'Registration Year', placeholder: 'e.g. 2022' },
    { key: 'Fuel Type', label: 'Fuel Type', type: 'select', options: ['Octane', 'Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'] },
    { key: 'Transmission', label: 'Transmission', type: 'select', options: ['Automatic (CVT)', 'Automatic', 'Manual'] },
    { key: 'Engine Capacity', label: 'Engine Capacity', placeholder: 'e.g. 1500 cc / 149 cc' },
    { key: 'Kilometers Run', label: 'Kilometers Run', placeholder: 'e.g. 46,000 km' },
  ],
  'Cars & Motors': [
    { key: 'Brand', label: 'Brand', placeholder: 'e.g. Honda, Suzuki' },
    { key: 'Model', label: 'Model', placeholder: 'e.g. Civic, Gixxer' },
    { key: 'Year of Manufacture', label: 'Year of Manufacture', placeholder: 'e.g. 2020' },
    { key: 'Registration Year', label: 'Registration Year', placeholder: 'e.g. 2021' },
    { key: 'Fuel Type', label: 'Fuel Type', type: 'select', options: ['Octane', 'Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'] },
    { key: 'Transmission', label: 'Transmission', type: 'select', options: ['Automatic (CVT)', 'Automatic', 'Manual'] },
    { key: 'Engine Capacity', label: 'Engine Capacity', placeholder: 'e.g. 150 cc' },
    { key: 'Kilometers Run', label: 'Kilometers Run', placeholder: 'e.g. 12,000 km' },
  ],
  Mobiles: [
    { key: 'Brand', label: 'Brand', placeholder: 'e.g. Apple, Samsung' },
    { key: 'Model', label: 'Model', placeholder: 'e.g. iPhone 15 Pro Max' },
    { key: 'Storage', label: 'Storage', placeholder: 'e.g. 256 GB' },
    { key: 'Color', label: 'Color', placeholder: 'e.g. Natural Titanium' },
    { key: 'Battery Health', label: 'Battery Health', placeholder: 'e.g. 99%' },
    { key: 'BTRC Status', label: 'BTRC Status', type: 'select', options: ['Official Approved', 'Unofficial', 'Unknown'] },
  ],
  Electronics: [
    { key: 'Brand', label: 'Brand', placeholder: 'e.g. Sony, Apple, Samsung' },
    { key: 'Model', label: 'Model', placeholder: 'e.g. PlayStation 5, MacBook Air M2' },
    { key: 'Storage', label: 'Storage / Capacity', placeholder: 'e.g. 825 GB SSD / 256 GB' },
    { key: 'Warranty', label: 'Warranty', placeholder: 'e.g. 1 Year remaining' },
    { key: 'Connectivity', label: 'Connectivity', placeholder: 'e.g. HDMI, Wi-Fi, Bluetooth' },
  ],
  Property: [
    { key: 'Property Type', label: 'Property Type', type: 'select', options: ['Apartment', 'House', 'Plot', 'Commercial', 'Room'] },
    { key: 'Size', label: 'Size (sqft)', placeholder: 'e.g. 1450 sqft' },
    { key: 'Bedrooms', label: 'Bedrooms', placeholder: 'e.g. 3' },
    { key: 'Bathrooms', label: 'Bathrooms', placeholder: 'e.g. 2' },
    { key: 'Furnishing', label: 'Furnishing', type: 'select', options: ['Furnished', 'Semi-furnished', 'Unfurnished'] },
    { key: 'Floor', label: 'Floor', placeholder: 'e.g. 5th floor' },
  ],
  'Home & Living': [
    { key: 'Brand', label: 'Brand', placeholder: 'e.g. IKEA, Hatil' },
    { key: 'Item Type', label: 'Item Type', placeholder: 'e.g. Sofa, Refrigerator' },
    { key: 'Material', label: 'Material', placeholder: 'e.g. Solid wood, Steel' },
    { key: 'Dimensions', label: 'Dimensions', placeholder: 'e.g. 6ft x 3ft' },
    { key: 'Warranty', label: 'Warranty', placeholder: 'e.g. 6 months' },
  ],
  'Fashion & Beauty': [
    { key: 'Brand', label: 'Brand', placeholder: 'e.g. Zara, Aarong' },
    { key: 'Item Type', label: 'Item Type', placeholder: 'e.g. Shirt, Saree' },
    { key: 'Size', label: 'Size', placeholder: 'e.g. M / 42 / Free size' },
    { key: 'Color', label: 'Color', placeholder: 'e.g. Navy Blue' },
    { key: 'Gender', label: 'Gender', type: 'select', options: ['Men', 'Women', 'Unisex', 'Kids'] },
    { key: 'Material', label: 'Material', placeholder: 'e.g. Cotton' },
  ],
  Jobs: [
    { key: 'Job Type', label: 'Job Type', type: 'select', options: ['Full-time', 'Part-time', 'Contract', 'Internship'] },
    { key: 'Experience', label: 'Experience Required', placeholder: 'e.g. 2+ years' },
    { key: 'Education', label: 'Education', placeholder: 'e.g. Bachelor degree' },
    { key: 'Salary Range', label: 'Salary Range', placeholder: 'e.g. 25,000 – 40,000 BDT' },
    { key: 'Workplace', label: 'Workplace', type: 'select', options: ['On-site', 'Remote', 'Hybrid'] },
  ],
};

export function fieldsForCategory(category: string): CategoryField[] {
  return CATEGORY_SPEC_FIELDS[category] || [
    { key: 'Brand', label: 'Brand', placeholder: 'Brand name' },
    { key: 'Model', label: 'Model', placeholder: 'Model name' },
  ];
}
