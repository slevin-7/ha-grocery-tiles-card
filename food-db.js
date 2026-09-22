// Port aus Fampla (food_database.dart + food_emoji_helper.dart). Reine Logik, kein DOM.

export const CATEGORIES = [
  { id: 'fruits_vegetables', label: 'Obst & Gemüse', emoji: '🥕', color: '#4caf50' },
  { id: 'dairy_eggs', label: 'Milchprodukte & Eier', emoji: '🥛', color: '#42a5f5' },
  { id: 'meat_fish', label: 'Fleisch & Fisch', emoji: '🥩', color: '#ef5350' },
  { id: 'bread_bakery', label: 'Brot & Backwaren', emoji: '🥖', color: '#d4a054' },
  { id: 'pasta_grains', label: 'Nudeln & Getreide', emoji: '🍝', color: '#ffb74d' },
  { id: 'frozen', label: 'Tiefkühl', emoji: '🧊', color: '#4dd0e1' },
  { id: 'beverages', label: 'Getränke', emoji: '🍹', color: '#ab47bc' },
  { id: 'other', label: 'Sonstiges', emoji: '🛒', color: '#9e9e9e' },
];

const CATEGORY_IDS = new Set(CATEGORIES.map(c => c.id));

const GROUPS = [
  {
    category: 'dairy_eggs',
    keywords: [
      'milch', 'vollmilch', 'fettarme milch', 'magermilch', 'h-milch',
      'frischmilch', 'biomilch', 'laktosefreie',
      'käse', 'gouda', 'emmentaler', 'mozzarella', 'parmesan', 'cheddar',
      'frischkäse', 'hüttenkäse', 'schmelzkäse',
      'joghurt', 'naturjoghurt', 'fruchtjoghurt', 'griechischer joghurt',
      'yoghurt',
      'butter', 'margarine', 'kräuterbutter',
      'sahne', 'schlagsahne', 'saure sahne', 'schmand', 'crème fraîche',
      'crème', 'creme',
      'quark', 'magerquark', 'buttermilch', 'kefir', 'pudding',
      'mascarpone', 'ricotta', 'feta', 'camembert', 'brie',
      'ziegenkäse', 'schafskäse', 'halloumi',
      'molke', 'rahm',
      'milk', 'whole milk', 'low-fat milk', 'skim milk', 'lactose-free',
      'cheese', 'cream cheese', 'cottage cheese',
      'yogurt', 'greek yogurt',
      'butter', 'cream', 'sour cream',
      'quark', 'buttermilk', 'kefir', 'pudding', 'custard',
      'mascarpone', 'ricotta', 'feta', 'camembert', 'brie',
    ],
  },
  {
    category: 'dairy_eggs',
    wordBoundary: true,
    keywords: [
      'ei', 'eier', 'eigelb', 'eiweiß', 'eiweiss',
      'egg', 'eggs',
    ],
  },
  {
    category: 'fruits_vegetables',
    keywords: [
      'apfel', 'äpfel', 'birne', 'banane', 'orange', 'apfelsine',
      'mandarine', 'clementine', 'zitrone', 'limette',
      'erdbeere', 'himbeere', 'brombeere', 'heidelbeere', 'blaubeere',
      'johannisbeere', 'kirsche', 'pflaume', 'zwetschge',
      'pfirsich', 'nektarine', 'aprikose',
      'traube', 'weintraube', 'melone', 'wassermelone', 'honigmelone',
      'ananas', 'kiwi', 'mango', 'papaya', 'avocado',
      'granatapfel', 'feige', 'datteln', 'beeren', 'obst',
      'apple', 'pear', 'banana', 'orange', 'tangerine', 'mandarin',
      'clementine', 'lemon', 'lime', 'grapefruit',
      'strawberry', 'raspberry', 'blackberry', 'blueberry', 'cranberry',
      'cherry', 'plum', 'peach', 'nectarine', 'apricot',
      'grape', 'melon', 'watermelon', 'pineapple', 'kiwi',
      'mango', 'papaya', 'avocado', 'pomegranate', 'fig', 'dates',
      'berries', 'fruit',
    ],
  },
  {
    category: 'fruits_vegetables',
    keywords: [
      'kartoffel', 'süßkartoffel', 'karotte', 'möhre',
      'tomate', 'cherrytomaten', 'gurke', 'salatgurke',
      'zwiebel', 'frühlingszwiebel', 'knoblauch',
      'paprika', 'chili', 'peperoni', 'zucchini', 'aubergine',
      'salat', 'kopfsalat', 'eisbergsalat', 'rucola', 'feldsalat',
      'spinat', 'brokkoli', 'blumenkohl', 'rosenkohl', 'grünkohl',
      'weißkohl', 'rotkohl', 'sellerie', 'lauch', 'porree', 'fenchel',
      'spargel', 'kohlrabi', 'radieschen', 'rettich', 'rote beete',
      'pastinake', 'kürbis', 'mais', 'erbsen', 'bohnen',
      'champignons', 'pilze', 'gemüse',
      'potato', 'sweet potato', 'carrot', 'tomato', 'cherry tomato',
      'cucumber', 'onion', 'spring onion', 'garlic',
      'pepper', 'bell pepper', 'chili', 'zucchini', 'courgette',
      'eggplant', 'aubergine',
      'lettuce', 'arugula', 'spinach', 'broccoli', 'cauliflower',
      'brussels sprout', 'kale', 'cabbage',
      'celery', 'leek', 'fennel', 'asparagus',
      'radish', 'beetroot', 'beet', 'pumpkin', 'squash',
      'corn', 'peas', 'beans', 'mushroom', 'vegetable',
    ],
  },
  {
    category: 'meat_fish',
    keywords: [
      'fleisch', 'rind', 'rindfleisch', 'rinderhack', 'hackfleisch', 'hack',
      'schwein', 'schweinefleisch', 'schweineschnitzel',
      'kalb', 'kalbfleisch', 'lamm',
      'steak', 'filet', 'braten', 'gulasch', 'kotelett',
      'speck', 'schinken', 'serrano',
      'hähnchen', 'hühnchen', 'hähnchenbrust', 'hähnchenkeule',
      'pute', 'putenbrust', 'truthahn', 'ente', 'gans',
      'wurst', 'bratwurst', 'salami', 'mettwurst', 'chorizo', 'bacon',
      'schnitzel', 'geflügel', 'huhn',
      'wild', 'hirsch', 'reh', 'wildschwein',
      'beef', 'ground beef', 'roast', 'pork', 'pork chop', 'ham',
      'chicken', 'chicken breast', 'turkey', 'duck', 'lamb', 'veal',
      'sausage', 'meat',
      'ossobuco', 'osso buco', 'ossibuchi', 'vitello', 'manzo', 'pollo',
      'pancetta', 'prosciutto', 'guanciale', 'bresaola', 'salame',
      'agnello', 'maiale', 'anatra', 'coniglio', 'tacchino',
      'salsiccia', 'coppa', 'mortadella', 'spalla',
    ],
  },
  {
    category: 'meat_fish',
    keywords: [
      'fisch', 'lachs', 'forelle', 'thunfisch', 'kabeljau',
      'garnele', 'shrimps', 'krabben', 'muscheln',
      'hering', 'makrele', 'sardine', 'aal', 'barsch', 'scholle',
      'seelachs', 'zander', 'dorade',
      'krabbe', 'krebs', 'hummer', 'muschel', 'austern',
      'tintenfisch', 'calamari', 'oktopus', 'meeresfrüchte',
      'fish', 'salmon', 'tuna', 'cod', 'trout',
      'shrimp', 'prawns', 'crab', 'lobster', 'mussels', 'seafood',
      'pesce', 'gamberi', 'vongole', 'cozze', 'tonno', 'acciughe',
    ],
  },
  {
    category: 'bread_bakery',
    keywords: [
      'brot', 'vollkornbrot', 'weißbrot', 'mischbrot', 'roggenbrot',
      'toast', 'toastbrot', 'brötchen', 'semmel', 'laugenbrötchen',
      'brezel', 'croissant', 'ciabatta', 'baguette', 'fladenbrot',
      'pitabrot', 'tortilla', 'wraps',
      'kuchen', 'käsekuchen', 'muffin', 'berliner', 'krapfen',
      'hörnchen', 'bagel', 'kekse', 'plätzchen',
      'bread', 'whole wheat', 'white bread', 'rye bread', 'toast',
      'roll', 'pretzel', 'croissant', 'ciabatta', 'baguette', 'pita',
      'tortilla', 'wrap', 'cake', 'muffin', 'donut', 'bagel',
      'cookie', 'biscuit',
    ],
  },
  {
    category: 'pasta_grains',
    keywords: [
      'nudeln', 'pasta', 'spaghetti', 'penne', 'fusilli', 'farfalle',
      'tagliatelle', 'makkaroni', 'lasagne', 'tortellini', 'ravioli',
      'gnocchi', 'spätzle',
      'reis', 'basmatireis', 'risottoreis', 'vollkornreis', 'wildreis',
      'bulgur', 'couscous', 'quinoa', 'hirse',
      'haferflocken', 'müsli', 'cornflakes', 'mehl', 'getreide',
      'pasta', 'spaghetti', 'penne', 'fusilli', 'macaroni', 'lasagna',
      'tortellini', 'ravioli', 'gnocchi', 'noodles',
      'rice', 'basmati', 'brown rice', 'wild rice',
      'bulgur', 'couscous', 'quinoa',
      'oats', 'oatmeal', 'muesli', 'cereal', 'cornflakes',
      'flour', 'grain',
    ],
  },
  {
    category: 'beverages',
    keywords: [
      'wasser', 'mineralwasser', 'sprudelwasser',
      'saft', 'orangensaft', 'apfelsaft', 'traubensaft', 'schorle',
      'limonade', 'cola', 'pepsi', 'fanta', 'sprite', 'eistee',
      'kaffee', 'espresso', 'cappuccino',
      'tee', 'schwarzer tee', 'grüner tee', 'kräutertee',
      'kakao', 'schokolade', 'smoothie',
      'bier', 'wein', 'rotwein', 'weißwein', 'sekt', 'prosecco',
      'getränk',
      'water', 'sparkling water',
      'juice', 'orange juice', 'apple juice', 'lemonade',
      'soda', 'cola', 'coke', 'iced tea',
      'coffee', 'espresso', 'cappuccino',
      'tea', 'green tea', 'herbal tea', 'hot chocolate',
      'smoothie',
      'beer', 'wine', 'red wine', 'white wine', 'champagne',
      'beverage', 'drink',
    ],
  },
  {
    category: 'frozen',
    keywords: [
      'tiefkühl', 'tk-', 'gefrier',
      'pizza', 'pommes', 'fischstäbchen', 'chicken nuggets',
      'eis', 'eiscreme',
      'frozen', 'pizza', 'fries', 'fish sticks', 'chicken nuggets',
      'ice cream',
    ],
  },
];

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordMatch = (text, kw) =>
  new RegExp(`(^|[^\\p{L}])${escapeRe(kw)}($|[^\\p{L}])`, 'iu').test(text);

function findOverride(lower, overrides) {
  for (const o of overrides || []) {
    if (o && typeof o.match === 'string' && o.match && lower.includes(o.match.toLowerCase())) return o;
  }
  return null;
}

export function categorize(name, overrides = []) {
  const lower = String(name || '').toLowerCase().trim();
  if (!lower) return 'other';
  const o = findOverride(lower, overrides);
  if (o && o.category) return CATEGORY_IDS.has(o.category) ? o.category : 'other';
  for (const g of GROUPS) {
    const hit = g.wordBoundary
      ? g.keywords.some(kw => wordMatch(lower, kw))
      : g.keywords.some(kw => lower.includes(kw));
    if (hit) return g.category;
  }
  return 'other';
}
