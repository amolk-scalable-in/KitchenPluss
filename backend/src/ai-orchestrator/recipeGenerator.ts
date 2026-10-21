// ============================================================
// KitchenPulse — AI Recipe Generator & Ingredient Extractor
// Generates culinary Bill of Materials (BOM) from natural prompts,
// detects new vs existing inventory items, and estimates Indian INR costs.
// ============================================================

import { getGeminiModel } from './geminiClient.js';
import {
  AiRecipeGenerateResponse,
  AiRecipeGeneratedIngredient,
} from '@kitchenpulse/shared';

interface ExistingIngredientLookup {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
}

// ── Fallback Indian Culinary Knowledge Base (INR ₹) ─────────

const CULINARY_KNOWLEDGE_BASE: Record<
  string,
  {
    station: string;
    price: number;
    prep_time_minutes: number;
    description: string;
    ingredients: Array<{
      name: string;
      unit: string;
      quantity_required: number;
      cost_per_unit: number;
      current_stock: number;
      minimum_threshold: number;
    }>;
  }
> = {
  'butter chicken': {
    station: 'Curry & Handi',
    price: 420.0,
    prep_time_minutes: 20,
    description:
      'Iconic Delhi-style Murgh Makhani slow-cooked in velvety tomato-cashew makhani gravy with pure butter, fresh cream, and kasuri methi.',
    ingredients: [
      {
        name: 'Boneless Chicken (Thighs)',
        unit: 'kg',
        quantity_required: 0.35,
        cost_per_unit: 260.0,
        current_stock: 35.0,
        minimum_threshold: 8.0,
      },
      {
        name: 'Fresh Amul Cream',
        unit: 'L',
        quantity_required: 0.05,
        cost_per_unit: 210.0,
        current_stock: 5.0,
        minimum_threshold: 2.0,
      },
      {
        name: 'Pure Desi Cow Ghee',
        unit: 'L',
        quantity_required: 0.03,
        cost_per_unit: 650.0,
        current_stock: 12.0,
        minimum_threshold: 4.0,
      },
      {
        name: 'Ginger Garlic Paste',
        unit: 'kg',
        quantity_required: 0.02,
        cost_per_unit: 180.0,
        current_stock: 10.0,
        minimum_threshold: 3.0,
      },
      {
        name: 'Kasuri Methi (Nagaur)',
        unit: 'g',
        quantity_required: 5.0,
        cost_per_unit: 0.45,
        current_stock: 500.0,
        minimum_threshold: 100.0,
      },
      {
        name: 'Makhani Tomato Gravy Base',
        unit: 'kg',
        quantity_required: 0.25,
        cost_per_unit: 95.0,
        current_stock: 20.0,
        minimum_threshold: 5.0,
      },
    ],
  },
  'paneer butter masala': {
    station: 'Curry & Handi',
    price: 340.0,
    prep_time_minutes: 15,
    description:
      'Succulent soft cottage cheese cubes simmered in a luscious buttery tomato gravy perfumed with green cardamom and kasuri methi.',
    ingredients: [
      {
        name: 'Fresh Malai Paneer',
        unit: 'kg',
        quantity_required: 0.25,
        cost_per_unit: 320.0,
        current_stock: 20.0,
        minimum_threshold: 5.0,
      },
      {
        name: 'Fresh Amul Cream',
        unit: 'L',
        quantity_required: 0.04,
        cost_per_unit: 210.0,
        current_stock: 5.0,
        minimum_threshold: 2.0,
      },
      {
        name: 'Pure Desi Cow Ghee',
        unit: 'L',
        quantity_required: 0.025,
        cost_per_unit: 650.0,
        current_stock: 12.0,
        minimum_threshold: 4.0,
      },
      {
        name: 'Makhani Tomato Gravy Base',
        unit: 'kg',
        quantity_required: 0.22,
        cost_per_unit: 95.0,
        current_stock: 20.0,
        minimum_threshold: 5.0,
      },
      {
        name: 'Kasuri Methi (Nagaur)',
        unit: 'g',
        quantity_required: 5.0,
        cost_per_unit: 0.45,
        current_stock: 500.0,
        minimum_threshold: 100.0,
      },
    ],
  },
  'dal makhani': {
    station: 'Curry & Handi',
    price: 290.0,
    prep_time_minutes: 25,
    description:
      'Legendary black urad lentils slow-cooked overnight over tandoor charcoal with churned white butter, cream, and subtle garam masala.',
    ingredients: [
      {
        name: 'Black Urad Dal (Makhani)',
        unit: 'kg',
        quantity_required: 0.20,
        cost_per_unit: 140.0,
        current_stock: 40.0,
        minimum_threshold: 10.0,
      },
      {
        name: 'Fresh Amul Cream',
        unit: 'L',
        quantity_required: 0.04,
        cost_per_unit: 210.0,
        current_stock: 5.0,
        minimum_threshold: 2.0,
      },
      {
        name: 'Pure Desi Cow Ghee',
        unit: 'L',
        quantity_required: 0.03,
        cost_per_unit: 650.0,
        current_stock: 12.0,
        minimum_threshold: 4.0,
      },
      {
        name: 'Ginger Garlic Paste',
        unit: 'kg',
        quantity_required: 0.015,
        cost_per_unit: 180.0,
        current_stock: 10.0,
        minimum_threshold: 3.0,
      },
    ],
  },
  'paneer tikka': {
    station: 'Tandoor & Starters',
    price: 320.0,
    prep_time_minutes: 18,
    description:
      'Char-grilled cottage cheese cubes marinated in spiced hung curd, mustard oil, ajwain, and grilled with tri-color bell peppers.',
    ingredients: [
      {
        name: 'Fresh Malai Paneer',
        unit: 'kg',
        quantity_required: 0.25,
        cost_per_unit: 320.0,
        current_stock: 20.0,
        minimum_threshold: 5.0,
      },
      {
        name: 'Tri-Color Bell Peppers',
        unit: 'kg',
        quantity_required: 0.10,
        cost_per_unit: 95.0,
        current_stock: 10.0,
        minimum_threshold: 3.0,
      },
      {
        name: 'Fresh Dahi / Curd',
        unit: 'kg',
        quantity_required: 0.06,
        cost_per_unit: 65.0,
        current_stock: 15.0,
        minimum_threshold: 4.0,
      },
      {
        name: 'Ginger Garlic Paste',
        unit: 'kg',
        quantity_required: 0.015,
        cost_per_unit: 180.0,
        current_stock: 10.0,
        minimum_threshold: 3.0,
      },
      {
        name: 'Mustard Oil & Tandoori Spices',
        unit: 'L',
        quantity_required: 0.02,
        cost_per_unit: 190.0,
        current_stock: 8.0,
        minimum_threshold: 2.0,
      },
    ],
  },
  'hyderabadi dum biryani': {
    station: 'Biryani & Rice',
    price: 390.0,
    prep_time_minutes: 22,
    description:
      'Kacchi dum biryani layered with long-grain aged Basmati rice, slow-cooked marinated chicken, golden birista onions, saffron, and pure cow ghee.',
    ingredients: [
      {
        name: 'Basmati Biryani Rice',
        unit: 'kg',
        quantity_required: 0.25,
        cost_per_unit: 165.0,
        current_stock: 45.0,
        minimum_threshold: 10.0,
      },
      {
        name: 'Boneless Chicken (Thighs)',
        unit: 'kg',
        quantity_required: 0.30,
        cost_per_unit: 260.0,
        current_stock: 35.0,
        minimum_threshold: 8.0,
      },
      {
        name: 'Pure Desi Cow Ghee',
        unit: 'L',
        quantity_required: 0.035,
        cost_per_unit: 650.0,
        current_stock: 12.0,
        minimum_threshold: 4.0,
      },
      {
        name: 'Fresh Dahi / Curd',
        unit: 'kg',
        quantity_required: 0.05,
        cost_per_unit: 65.0,
        current_stock: 15.0,
        minimum_threshold: 4.0,
      },
      {
        name: 'Fried Onions (Birista)',
        unit: 'kg',
        quantity_required: 0.04,
        cost_per_unit: 220.0,
        current_stock: 6.0,
        minimum_threshold: 1.5,
      },
      {
        name: 'Kashmiri Saffron & Milk',
        unit: 'L',
        quantity_required: 0.02,
        cost_per_unit: 450.0,
        current_stock: 2.0,
        minimum_threshold: 0.5,
      },
    ],
  },
  'royal mango lassi': {
    station: 'Bar & Drinks',
    price: 140.0,
    prep_time_minutes: 5,
    description:
      'Thick sweet blended yogurt beverage infused with authentic Ratnagiri Alphonso mango pulp, green cardamom, and slivered pistachios.',
    ingredients: [
      {
        name: 'Alphonso Mango Pulp',
        unit: 'L',
        quantity_required: 0.12,
        cost_per_unit: 220.0,
        current_stock: 14.0,
        minimum_threshold: 3.0,
      },
      {
        name: 'Fresh Dahi / Curd',
        unit: 'kg',
        quantity_required: 0.18,
        cost_per_unit: 65.0,
        current_stock: 15.0,
        minimum_threshold: 4.0,
      },
      {
        name: 'Green Cardamom & Pistachio',
        unit: 'g',
        quantity_required: 5.0,
        cost_per_unit: 2.2,
        current_stock: 250.0,
        minimum_threshold: 50.0,
      },
    ],
  },
  'gulab jamun': {
    station: 'Desserts & Mithai',
    price: 160.0,
    prep_time_minutes: 8,
    description:
      'Warm khoya dumplings steeped in rose and green cardamom scented sugar syrup, served with creamy saffron rabdi.',
    ingredients: [
      {
        name: 'Fresh Khoya / Mawa',
        unit: 'kg',
        quantity_required: 0.12,
        cost_per_unit: 380.0,
        current_stock: 5.0,
        minimum_threshold: 1.5,
      },
      {
        name: 'Sugar & Rose Water Syrup',
        unit: 'L',
        quantity_required: 0.10,
        cost_per_unit: 45.0,
        current_stock: 10.0,
        minimum_threshold: 2.0,
      },
      {
        name: 'Saffron Rabdi',
        unit: 'L',
        quantity_required: 0.06,
        cost_per_unit: 320.0,
        current_stock: 4.0,
        minimum_threshold: 1.0,
      },
    ],
  },
};

function inferStationFromPrompt(prompt: string, hint?: string): string {
  if (hint && hint !== 'AUTO' && hint !== 'ALL') return hint;
  const p = prompt.toLowerCase();
  if (
    p.includes('lassi') ||
    p.includes('chai') ||
    p.includes('tea') ||
    p.includes('chaas') ||
    p.includes('shikanji') ||
    p.includes('mojito') ||
    p.includes('drink') ||
    p.includes('sharbat') ||
    p.includes('juice')
  ) {
    return 'Bar & Drinks';
  }
  if (
    p.includes('tikka') ||
    p.includes('kebab') ||
    p.includes('tandoori') ||
    p.includes('chaat') ||
    p.includes('samosa') ||
    p.includes('starter')
  ) {
    return 'Tandoor & Starters';
  }
  if (
    p.includes('biryani') ||
    p.includes('pulao') ||
    p.includes('rice') ||
    p.includes('khichdi')
  ) {
    return 'Biryani & Rice';
  }
  if (
    p.includes('roti') ||
    p.includes('naan') ||
    p.includes('paratha') ||
    p.includes('kulcha') ||
    p.includes('tawa') ||
    p.includes('dosa')
  ) {
    return 'Tawa & Breads';
  }
  if (
    p.includes('gulab jamun') ||
    p.includes('rasmalai') ||
    p.includes('kheer') ||
    p.includes('halwa') ||
    p.includes('dessert') ||
    p.includes('mithai') ||
    p.includes('kulfi')
  ) {
    return 'Desserts & Mithai';
  }
  return 'Curry & Handi';
}

function generateGenericFallback(
  prompt: string,
  stationHint?: string
): {
  dish_name: string;
  station: string;
  price: number;
  prep_time_minutes: number;
  description: string;
  ingredients: Array<{
    name: string;
    unit: string;
    quantity_required: number;
    cost_per_unit: number;
    current_stock: number;
    minimum_threshold: number;
  }>;
} {
  const station = inferStationFromPrompt(prompt, stationHint);
  const isDrink = station === 'Bar & Drinks';
  const isDessert = station === 'Desserts & Mithai';

  if (isDrink) {
    return {
      dish_name: prompt.trim(),
      station,
      price: 120.0,
      prep_time_minutes: 5,
      description: `Authentic handcrafted ${prompt.trim()} freshly prepared at the beverage bar with traditional Indian flavors.`,
      ingredients: [
        {
          name: `${prompt.trim()} Base Mix`,
          unit: 'L',
          quantity_required: 0.15,
          cost_per_unit: 110.0,
          current_stock: 10.0,
          minimum_threshold: 2.5,
        },
        {
          name: 'Fresh Mint & Lemons',
          unit: 'pcs',
          quantity_required: 1.0,
          cost_per_unit: 10.0,
          current_stock: 30.0,
          minimum_threshold: 8.0,
        },
        {
          name: 'Chilled Soda / Water',
          unit: 'L',
          quantity_required: 0.20,
          cost_per_unit: 20.0,
          current_stock: 20.0,
          minimum_threshold: 5.0,
        },
      ],
    };
  }

  if (isDessert) {
    return {
      dish_name: prompt.trim(),
      station,
      price: 150.0,
      prep_time_minutes: 8,
      description: `Traditional Indian sweet delicacy prepared with pure mawa, saffron, and dry fruits.`,
      ingredients: [
        {
          name: 'Khoya / Condensed Milk Base',
          unit: 'kg',
          quantity_required: 0.15,
          cost_per_unit: 340.0,
          current_stock: 6.0,
          minimum_threshold: 2.0,
        },
        {
          name: 'Desi Cow Ghee',
          unit: 'L',
          quantity_required: 0.02,
          cost_per_unit: 650.0,
          current_stock: 8.0,
          minimum_threshold: 2.0,
        },
        {
          name: 'Saffron & Green Cardamom',
          unit: 'g',
          quantity_required: 3.0,
          cost_per_unit: 2.5,
          current_stock: 200.0,
          minimum_threshold: 50.0,
        },
      ],
    };
  }

  return {
    dish_name: prompt.trim(),
    station,
    price: 350.0,
    prep_time_minutes: 20,
    description: `Authentic restaurant-style ${prompt.trim()} prepared fresh to order with house-ground Indian spices and desi ghee.`,
    ingredients: [
      {
        name: `${prompt.trim()} Core Protein / Veggie`,
        unit: 'kg',
        quantity_required: 0.30,
        cost_per_unit: 280.0,
        current_stock: 15.0,
        minimum_threshold: 4.0,
      },
      {
        name: 'Onion Tomato Masala Base',
        unit: 'kg',
        quantity_required: 0.15,
        cost_per_unit: 90.0,
        current_stock: 20.0,
        minimum_threshold: 5.0,
      },
      {
        name: 'Pure Desi Cow Ghee',
        unit: 'L',
        quantity_required: 0.03,
        cost_per_unit: 650.0,
        current_stock: 12.0,
        minimum_threshold: 3.0,
      },
      {
        name: 'Ginger Garlic Paste',
        unit: 'kg',
        quantity_required: 0.02,
        cost_per_unit: 180.0,
        current_stock: 8.0,
        minimum_threshold: 2.0,
      },
    ],
  };
}

// ── Main AI Generator Entrypoint ─────────────────────────────

export async function generateAiRecipe(
  prompt: string,
  stationHint?: string,
  existingIngredients: ExistingIngredientLookup[] = []
): Promise<AiRecipeGenerateResponse> {
  const normalizedPrompt = prompt.trim().toLowerCase();
  const apiKey = process.env.GEMINI_API_KEY;

  let rawResult: {
    dish_name: string;
    station: string;
    price: number;
    prep_time_minutes: number;
    description?: string;
    ingredients: Array<{
      name: string;
      unit: string;
      quantity_required: number;
      cost_per_unit?: number;
      current_stock?: number;
      minimum_threshold?: number;
    }>;
  } | null = null;

  // 1. Try Gemini API first if configured
  if (apiKey && apiKey !== 'your_key_here' && apiKey.trim().length > 10) {
    try {
      const model = getGeminiModel('gemini-1.5-flash');

      const existingNames = existingIngredients
        .map((i) => `"${i.name}" (${i.unit}, ~₹${Number(i.cost_per_unit).toFixed(2)}/${i.unit})`)
        .slice(0, 40)
        .join(', ');

      const systemPrompt = `You are an Executive Chef and Commercial Kitchen Costing Consultant for top Indian hotels and restaurants.
A restaurant kitchen needs a standard recipe Bill of Materials (BOM) for the following Indian dish or drink:
"${prompt}".

Available Kitchen Stations:
- "Tandoor & Starters"
- "Curry & Handi"
- "Biryani & Rice"
- "Tawa & Breads"
- "Bar & Drinks"
- "Desserts & Mithai"
- "South Indian"

${stationHint && stationHint !== 'AUTO' ? `The user suggested station: "${stationHint}". Use it if appropriate.` : ''}

Currently stocked ingredients in this kitchen include:
[${existingNames}]

CRITICAL INSTRUCTIONS:
1. Re-use existing ingredient names EXACTLY where applicable to prevent duplicate stock rows.
2. For missing ingredients, specify realistic unit costs in Indian Rupees (₹ INR) per kg, L, or piece (e.g. Paneer ₹320/kg, Desi Ghee ₹650/L, Chicken ₹260/kg, Basmati Rice ₹165/kg).
3. Recipe sale price MUST be in Indian Rupees (₹ INR) matching commercial Indian restaurant pricing (e.g., ₹280 - ₹650 for curries/biryanis, ₹180 - ₹380 for starters/tandoori, ₹80 - ₹220 for drinks/beverages).
4. Output STRICT JSON format matching this schema:
{
  "dish_name": "Standard menu name",
  "station": "Tandoor & Starters" | "Curry & Handi" | "Biryani & Rice" | "Tawa & Breads" | "Bar & Drinks" | "Desserts & Mithai",
  "price": 380.0,
  "prep_time_minutes": 20,
  "description": "Appetizing chef menu description",
  "ingredients": [
    {
      "name": "Exact ingredient name",
      "unit": "kg" | "g" | "L" | "ml" | "pcs",
      "quantity_required": 0.25,
      "cost_per_unit": 320.0,
      "current_stock": 10.0,
      "minimum_threshold": 3.0
    }
  ]
}`;

      const res = await model.generateContent(systemPrompt);
      const text = res.response.text();
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      rawResult = JSON.parse(cleaned);
    } catch (err) {
      console.warn('[recipeGenerator] Gemini extraction failed, falling back to culinary knowledge base:', err);
    }
  }

  // 2. Fallback to knowledge base or generic Indian fallback
  if (!rawResult) {
    const matchedKey = Object.keys(CULINARY_KNOWLEDGE_BASE).find((k) =>
      normalizedPrompt.includes(k)
    );

    if (matchedKey) {
      const match = CULINARY_KNOWLEDGE_BASE[matchedKey];
      rawResult = {
        dish_name: prompt.trim(),
        station: inferStationFromPrompt(prompt, match.station),
        price: match.price,
        prep_time_minutes: match.prep_time_minutes,
        description: match.description,
        ingredients: match.ingredients,
      };
    } else {
      rawResult = generateGenericFallback(prompt, stationHint);
    }
  }

  // 3. Match against existing inventory to avoid duplicates
  let calculatedPortionCost = 0;
  let newIngredientsCount = 0;

  const processedIngredients: AiRecipeGeneratedIngredient[] = rawResult.ingredients.map((ing) => {
    const matched = existingIngredients.find(
      (e) => e.name.toLowerCase().trim() === ing.name.toLowerCase().trim()
    );

    const isNew = !matched;
    if (isNew) newIngredientsCount++;

    const unit = matched?.unit || ing.unit || 'kg';
    const costPerUnit = Number(matched?.cost_per_unit ?? ing.cost_per_unit ?? 0);
    const qty = Number(ing.quantity_required) || 0;
    const itemTotal = Number((costPerUnit * qty).toFixed(2));
    calculatedPortionCost += itemTotal;

    return {
      ingredient_id: matched?.id,
      name: matched?.name || ing.name.trim(),
      unit,
      quantity_required: qty,
      cost_per_unit: costPerUnit,
      current_stock: matched ? undefined : Number(ing.current_stock ?? 10),
      minimum_threshold: matched ? undefined : Number(ing.minimum_threshold ?? 3),
      is_new: isNew,
    };
  });

  const portionCost = Number(calculatedPortionCost.toFixed(2));
  const salePrice = Number(rawResult.price) || 350.0;
  const grossMargin = Number((salePrice - portionCost).toFixed(2));
  const foodCostPercent = salePrice > 0 ? Number(((portionCost / salePrice) * 100).toFixed(1)) : 0;
  const grossMarginPercent = salePrice > 0 ? Number((100 - foodCostPercent).toFixed(1)) : 0;

  return {
    dish_name: rawResult.dish_name || prompt.trim(),
    station: rawResult.station || 'Curry & Handi',
    price: salePrice,
    prep_time_minutes: Number(rawResult.prep_time_minutes) || 15,
    description: rawResult.description,
    estimated_cost_per_portion: portionCost,
    suggested_margin_pct: grossMarginPercent,
    estimated_portion_cost: portionCost,
    gross_margin: grossMargin,
    food_cost_percentage: foodCostPercent,
    gross_margin_percentage: grossMarginPercent,
    ingredients: processedIngredients,
    new_ingredients_count: newIngredientsCount,
  };
}
