import { ServiceTier } from '../model/interface/subscription';

export const SERVICE_TIERS: ServiceTier[] = [
  {
    id: 'basic',
    name: 'basic',
    displayName: 'Basic Tier',
    description: 'Essential Insights',
    monthlyPrice: 150,
    yearlyPrice: 1530,
    yearlyDiscount: 15,
    features: [
      'Comp Set Identification: Instantly identifies relevant competitor restaurants based on your geography, type, cuisine, and key services offered',
      'Market Trend Analysis: Uncover pricing and menu trends using 1 year of real market data',
      'Easy-to-Use Dashboard: Access all insights via a user-friendly dashboard'
    ],
    isPopular: false,
    isCustomPricing: false,
    stripePriceIdMonthly: 'price_basic_monthly', // Replace with actual Stripe price IDs
    stripePriceIdYearly: 'price_basic_yearly'
  },
  {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro Tier',
    description: 'AI-Powered Analytics',
    monthlyPrice: 0, // Custom pricing
    yearlyPrice: 0,
    yearlyDiscount: 0,
    features: [
      'Everything in Basic, plus:',
      'AI-Driven Sales & Margin Analysis: See projected sales and margin impacts of your pricing decisions',
      'Customer Traffic Insights: Understand how pricing changes may affect customer footfall and behavior',
      'Forecasting: Predict future sales and margin performance based on current and historical trends',
      'Automated Recommendations: AI-generated actionable suggestions for pricing optimization'
    ],
    isPopular: true,
    isCustomPricing: true
  },
  {
    id: 'enterprise',
    name: 'enterprise',
    displayName: 'Enterprise Tier',
    description: 'Strategic Operations & Supply Chain',
    monthlyPrice: 0, // Custom pricing
    yearlyPrice: 0,
    yearlyDiscount: 0,
    features: [
      'Everything in Pro, plus:',
      'Cost & Supply Chain Impact Analysis: Analyze how ingredient costs, supplier pricing, and logistics affect menu profitability',
      'Custom Data Integration: Integrate with your POS, supplier, or inventory systems for end-to-end visibility',
      'Advanced Reporting: Access tailored reports for multi-unit operators, CFOs, and supply chain managers',
      'Dedicated Account Support: Priority onboarding, training, and ongoing consultative support'
    ],
    isPopular: false,
    isCustomPricing: true
  }
];

export const BILLING_CYCLES = [
  { id: 'monthly', label: 'Monthly', description: 'Billed monthly' }
];