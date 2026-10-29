import { CategoryConfig } from '../types';

/**
 * ============================================================================
 * 2. MAIN CATEGORIES & SUBCATEGORIES
 * ============================================================================
 * Add, rename, reorder, or remove any Main Category or Subcategory below.
 * Note: "All Materials" is shown automatically as the first tab in the store.
 *
 * Tip: Products in 'fans', 'lights', and 'tools' (or any category whose id/name
 * contains fan, light, bulb, lamp, or tool) automatically open the full
 * Product Details Page with Similar Products when clicked!
 */
export const ADMIN_CATEGORIES: CategoryConfig[] = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    subcategories: [
      'CPVC Pipes & Fittings',
      'UPVC Pipes & Fittings',
      'PVC / SWR Drainage',
      'Brass & GI Fittings',
      'Valves, Taps & Mixers',
      'Solvent, Thread & Sealants',
      'Tanks & Sanitaryware',
    ],
    description: 'ISI CPVC, UPVC, SWR pipes, brass elbows, ball valves, taps, and solvent cements.',
  },
  {
    id: 'electrical',
    name: 'Electrical',
    subcategories: [
      'House Wires & Cables',
      'MCB, RCCB & Distribution Boards',
      'Modular Switches & Sockets',
      'PVC Conduits & Casing',
      'Junction & Concealed Boxes',
      'Tapes, Clips & Accessories',
    ],
    description: 'FR/FRLS copper coils, MCB breakers, modular switches, conduits, and site accessories.',
  },
  {
    id: 'fans',
    name: 'Fans',
    subcategories: [
      'Table Fans',
      'Exhaust Fans',
      'Ceiling Fans',
      'Portable Fans',
    ],
    description: 'High-speed ceiling fans, kitchen/bathroom exhaust fans, table fans, and rechargeable portable fans.',
  },
  {
    id: 'lights',
    name: 'Lights',
    subcategories: [
      'Decorative Lights',
      'Tube Lights',
      'Bed Lights',
      'Bulbs',
    ],
    description: 'LED bulbs, batten tube lights, warm bed/night lamps, and architectural decorative lighting.',
  },
  {
    id: 'tools',
    name: 'Tools',
    subcategories: [
      'Plumbing Wrenches & Cutters',
      'Electrical Testers & Pliers',
      'Power Drills & Blades',
      'Measuring & Safety Gear',
      'Fasteners & Wall Plugs',
    ],
    description: 'Pipe wrenches, PVC cutters, insulated pliers, drill bits, PTFE, and jobsite hardware.',
  },
];
