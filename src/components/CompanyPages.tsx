import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  Layers,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Truck,
  Wrench,
  Zap,
  Hammer,
  Package,
  BookOpen,
  Fan,
  Lightbulb,
  Droplets,
} from 'lucide-react';
import { Product, StoreSettings, CategoryConfig } from '../types';
import { DEFAULT_CATEGORIES } from '../data/categories';
import { generateDirectWhatsAppChatUrl } from '../utils/whatsapp';
import {
  WhatsAppBadgeIcon,
  InstagramBadgeIcon,
  CallBadgeIcon,
  GmailBadgeIcon,
} from './BrandIcons';

export type CompanyPageId = 'home' | 'about' | 'categories' | 'blog' | 'faqs' | 'contact';

interface CompanyPagesProps {
  activePage: Exclude<CompanyPageId, 'home'>;
  onNavigatePage: (page: CompanyPageId) => void;
  onSelectCatalogCategory: (category: string, searchQuery?: string, subcategory?: string) => void;
  onOpenBookingMode: (mode: 'cart_delivery' | 'phone_callback' | 'image_upload' | 'whatsapp_order') => void;
  onOpenLocationModal: () => void;
  products: Product[];
  storeSettings: StoreSettings;
  categories?: CategoryConfig[];
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  topic: 'Plumbing' | 'Electrical' | 'Site Management';
  publishedDate: string;
  readTime: string;
  author: string;
  excerpt: string;
  relatedCategory: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
    checklist?: string[];
  }>;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: 'cpvc-vs-upvc-sizing',
    slug: 'cpvc-vs-upvc-pipe-sizing-hyderabad-sites',
    title: 'CPVC vs. UPVC Pipe Sizing for High-Pressure Apartment Risers',
    topic: 'Plumbing',
    publishedDate: 'Oct 14, 2026',
    readTime: '5 min read',
    author: 'Ramesh K. · Master Plumbing Dispatcher',
    excerpt:
      'Choosing SDR-11 vs. SDR-13.5 and matching brass FTA/MTA transitions prevents thermal expansion leaks on concealed hot-water lines.',
    relatedCategory: 'plumbing',
    sections: [
      {
        heading: 'Why Hot & Cold Lines Fail Prematurely on Multi-Floor Sites',
        paragraphs: [
          'Across residential apartment projects in LB Nagar, Uppal, and Nagole, one of the most frequent rework calls comes from using cold-water UPVC pipes near solar water heater manifolds or geyser outlets. UPVC softens above 60°C, whereas ISI-rated CPVC (IS 15778) safely handles hot water up to 93°C.',
          'For concealed bathroom walls, SDR-11 CPVC provides a thicker wall profile and higher pressure rating than SDR-13.5, giving plumbers reliable safety margins when booster pumps are installed on terrace tanks.'
        ]
      },
      {
        heading: 'Standard Field Sizing Rules for Bathroom & Kitchen Loops',
        paragraphs: [
          'Downsizing too early creates pressure drops when two fixtures open simultaneously. Keep main vertical shaft drops at 1-1/4" or 1", step into the bathroom grid at 3/4", and transition to 1/2" only at individual diverter or bib-cock points.'
        ],
        checklist: [
          'Use heavy brass-threaded CPVC FTA/MTA fittings at all angle valve and mixer points—never thread plastic onto metal nipples.',
          'Apply yellow medium-bodied CPVC solvent cement (never standard clear PVC glue) and allow 15 minutes set time before pressure testing.',
          'Install pipe clamps every 3 feet on horizontal runs to absorb thermal expansion.'
        ]
      }
    ]
  },
  {
    id: 'frls-wire-gauge-guide',
    slug: 'frls-copper-wire-gauge-residential-loads',
    title: 'Selecting FRLS Copper Wire Gauges for Residential & Commercial Loads',
    topic: 'Electrical',
    publishedDate: 'Oct 08, 2026',
    readTime: '6 min read',
    author: 'Srinivas Rao · Electrical Supply Lead',
    excerpt:
      'A practical jobsite reference for 1.0, 1.5, 2.5, 4.0, and 6.0 sq mm multistrand FRLS copper wiring across lighting, power sockets, and AC circuits.',
    relatedCategory: 'electrical',
    sections: [
      {
        heading: 'Matching Wire Cross-Section to Real Appliance Loads',
        paragraphs: [
          'Modern flats run induction cooktops, 1.5-ton inverter ACs, and instant geysers simultaneously. Undersized cables overheat inside PVC conduits, degrading insulation and tripping MCBs during peak summer evenings.',
          'Always specify Flame Retardant Low Smoke (FRLS) Electrolytic Grade 99.97% pure copper multistrand coils so conduit pulling remains smooth around 90-degree bends.'
        ],
        checklist: [
          '1.0 sq mm: Dedicated LED lighting points, ceiling fans, and bell circuits.',
          '1.5 sq mm: Switchboard looping and 6A bedroom/living sockets.',
          '2.5 sq mm: 16A kitchen utility sockets, washing machines, and refrigerators.',
          '4.0 sq mm: Dedicated home Runs for 1.5T–2.0T Split ACs and 3kW bathroom geysers.',
          '6.0 sq mm & above: Sub-main distribution feeders from meter panel to flat DB.'
        ]
      },
      {
        heading: 'Color-Coding Discipline for Faster Maintenance',
        paragraphs: [
          'Keep strict color separation—Red/Yellow/Blue for Phase, Black for Neutral, and Green (at least 1.5 sq mm) for Earth—so future fault tracing takes minutes instead of hours.'
        ]
      }
    ]
  },
  {
    id: 'concealed-hydrotest-checklist',
    slug: 'preventing-concealed-bathroom-plumbing-leaks',
    title: 'Pre-Tiling Concealed Plumbing Pressure Test Checklist',
    topic: 'Plumbing',
    publishedDate: 'Sep 29, 2026',
    readTime: '4 min read',
    author: 'Ramesh K. · Master Plumbing Dispatcher',
    excerpt:
      'Spend 30 minutes testing concealed joints before plastering to save ₹40,000+ in tile breaking and waterproofing repairs later.',
    relatedCategory: 'plumbing',
    sections: [
      {
        heading: 'Never Close Wall Chases Without a Gauge Test',
        paragraphs: [
          'Hairline dry-fits—where a plumber pushes an elbow onto a pipe during measurement and forgets solvent cement—often hold low tank pressure for a day before weeping behind fresh ceramic tiles.',
          'Plug all brass outlets with GI test plugs wrapped in high-density PTFE Teflon tape, pressurize the line to 10 kg/cm² (approx. 140 PSI) using a manual hydro-test pump, and monitor the dial for a minimum of 2 hours.'
        ],
        checklist: [
          'Inspect every concealed diverter cartridge body level with a spirit level before mortar packing.',
          'Photograph all wall chases with a measuring tape in frame before plastering so carpenters and drillers never puncture live lines.',
          'Keep protective end-caps on flush valves and drain traps to block tile grout.'
        ]
      }
    ]
  },
  {
    id: 'mcb-rccb-db-sizing',
    slug: 'mcb-rccb-distribution-board-sizing-guide',
    title: 'MCB & RCCB Distribution Board Sizing: Stopping Nuisance Tripping',
    topic: 'Electrical',
    publishedDate: 'Sep 18, 2026',
    readTime: '5 min read',
    author: 'Srinivas Rao · Electrical Supply Lead',
    excerpt:
      'Understanding B-Curve vs. C-Curve breakers and why 30mA RCCB protection is mandatory for wet zones and outdoor motor pumps.',
    relatedCategory: 'electrical',
    sections: [
      {
        heading: 'B-Curve vs. C-Curve MCBs Explained for Contractors',
        paragraphs: [
          'Using the wrong breaker curve either causes nuisance tripping every time a borewell motor starts or fails to trip fast enough on lighting short circuits.',
          'Use B-Curve MCBs (3–5x rated current trip) for resistive loads such as LED lighting and geysers. Specify C-Curve MCBs (5–10x rated current trip) for inductive startup surges like air conditioners, submersible pumps, and power tools.'
        ],
        checklist: [
          'Install a 40A or 63A 30mA sensitivity RCCB/ELCB upstream of bathroom, kitchen, and outdoor circuits to protect against earth leakage shock.',
          'Torque copper busbar screws firmly—loose neutral bar terminations are the #1 cause of charred DB enclosures.',
          'Leave 2 spare module ways in every 8-way or 12-way TPN/SPN DB for future inverter or EV charger additions.'
        ]
      }
    ]
  },
  {
    id: 'jobsite-material-planning',
    slug: 'eliminating-jobsite-idle-labor-rapid-procurement',
    title: 'How Rapid 30-Minute Replenishment Cuts Contractor Labor Wastage',
    topic: 'Site Management',
    publishedDate: 'Sep 05, 2026',
    readTime: '4 min read',
    author: 'Minute Materials Operations Team',
    excerpt:
      'Why sending skilled electricians or plumbers to local hardware shops mid-shift costs 3x more than express site-drop delivery.',
    relatedCategory: 'all',
    sections: [
      {
        heading: 'The Hidden Cost of Missing Three Fittings on Site',
        paragraphs: [
          'When a 3-person plumbing or electrical crew halts work at 11:30 AM because they are short by four brass elbows, two junction boxes, or a roll of Teflon tape, sending a technician out in city traffic easily burns 90 minutes of productive labor.',
          'By snapping a photo of your handwritten material slip or calling our LB Nagar dispatch desk, materials are picked, verified, and dispatched by two-wheeler or mini-truck in 15–30 minutes—keeping your crew working continuously.'
        ],
        checklist: [
          'Do a 5-minute stock check at 5:30 PM for next-morning 6:30 AM dispatch.',
          'Use AI Slip Upload for handwritten Telugu/English contractor lists—no typing required.',
          'Pay via UPI or Cash right at the gate after counting your items—zero advance needed.'
        ]
      }
    ]
  }
];

interface FaqItem {
  id: string;
  category: 'Delivery & Areas' | 'Ordering & Slip Scan' | 'Pricing & Payment' | 'Returns & Brands';
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'Delivery & Areas',
    question: 'How fast does Minute Materials deliver to active construction sites?',
    answer:
      'Orders within 5–8 km of our Chinthalkunta / LB Nagar Ring Road express hub—including LB Nagar, Vanasthalipuram, Hastinapuram, Nagole, Kothapet, Dilsukhnagar, and Hayathnagar—typically arrive in 15 to 30 minutes. Extended zones across Uppal, Malakpet, Boduppal, and BN Reddy Nagar arrive in 30 to 45 minutes.'
  },
  {
    id: 'faq-2',
    category: 'Delivery & Areas',
    question: 'What are your daily dispatch operating hours?',
    answer:
      'Our hub operates 7 days a week from 6:00 AM to 11:00 PM so contractors can stock up before morning labor shifts begin or finish urgent night maintenance jobs without delay.'
  },
  {
    id: 'faq-3',
    category: 'Ordering & Slip Scan',
    question: 'How does the handwritten Contractor Slip (Photo Upload) ordering work?',
    answer:
      'Click "Materials List (Photo to Text)" in the header, snap a clear photo of your plumber or electrician’s handwritten paper slip, and submit your phone number. Our AI OCR extracts item names, sizes, and quantities, and our dispatch supervisor calls within minutes to confirm exact brands before sending the rider.'
  },
  {
    id: 'faq-4',
    category: 'Ordering & Slip Scan',
    question: 'Can I order if a specific pipe size or fitting is not listed in the online catalog?',
    answer:
      'Yes. Use the 30-Second Phone Callback option or WhatsApp Hotline (+91 8332869926). Our warehouse carries over 1,500+ trade SKUs including specialized reducers, valves, glandates, and switchgear.'
  },
  {
    id: 'faq-5',
    category: 'Pricing & Payment',
    question: 'Are there any extra GST or hidden tax surcharges added at checkout?',
    answer:
      'No extra GST or tax percentage is added during billing—the item prices and transparent delivery/handling fees shown in your cart summary are the exact net amounts you pay.'
  },
  {
    id: 'faq-6',
    category: 'Pricing & Payment',
    question: 'Do I have to pay an advance online before dispatch?',
    answer:
      'No advance is required for standard orders. You can choose Cash on Delivery (COD) or scan our rider’s UPI QR code right at your jobsite gate after inspecting your materials.'
  },
  {
    id: 'faq-7',
    category: 'Pricing & Payment',
    question: 'Do you offer wholesale rates for builders and full-building contracts?',
    answer:
      'Yes. Independent plumbers, electricians, and site engineers ordering full pipe bundles, wire cartons, or complete apartment switchgear sets receive trade contractor pricing. Reach out via our Contact Us form or call dispatch directly.'
  },
  {
    id: 'faq-8',
    category: 'Returns & Brands',
    question: 'Are all pipes, wires, and breakers 100% genuine ISI-certified brands?',
    answer:
      'Every coil, pipe length, solvent tin, and breaker is sourced directly from authorized distributor channels with verifiable ISI markings and manufacturer batch codes. We strictly never stock counterfeit or underweight local cables.'
  },
  {
    id: 'faq-9',
    category: 'Returns & Brands',
    question: 'What if my technician ordered 1/2 inch fittings instead of 3/4 inch by mistake?',
    answer:
      'Unused, uncut, and undamaged items in original condition can be exchanged on the next rider run or directly at our Chinthalkunta / LB Nagar hub. Simply call our helpline with your Booking ID.'
  }
];

export const CompanyPages: React.FC<CompanyPagesProps> = ({
  activePage,
  onNavigatePage,
  onSelectCatalogCategory,
  onOpenBookingMode,
  onOpenLocationModal,
  products,
  storeSettings,
  categories = DEFAULT_CATEGORIES,
}) => {
  // Blog reader state
  const [selectedTopic, setSelectedTopic] = useState<'All' | BlogPost['topic']>('All');
  const [activePostId, setActivePostId] = useState<string | null>(null);

  // FAQ state
  const [faqCategory, setFaqCategory] = useState<'All' | FaqItem['category']>('All');
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactType, setContactType] = useState('bulk_quote');
  const [contactOrderId, setContactOrderId] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const pageLabels: Record<Exclude<CompanyPageId, 'home'>, string> = {
    about: 'About Us',
    categories: 'Categories',
    blog: 'Blog & Trade Guides',
    faqs: 'Frequently Asked Questions',
    contact: 'Contact Us'
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);

    if (!contactName.trim() || !contactPhone.trim() || !contactMessage.trim()) {
      setContactError('Please enter your name, phone number, and message.');
      return;
    }

    setIsSubmittingContact(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName.trim(),
          phone: contactPhone.trim(),
          orderId: contactOrderId.trim() || undefined,
          category: contactType,
          description: contactMessage.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not send message right now.');
      }

      setSubmittedRef(data.complaint?.id || `INQ-${Math.floor(100000 + Math.random() * 900000)}`);
      setContactName('');
      setContactPhone('');
      setContactOrderId('');
      setContactMessage('');
    } catch (err: any) {
      setContactError(err.message || 'Unable to submit message. Please call our helpline directly.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // Compute live category stats from configured categories & store catalog
  const getIconForCategory = (catId: string) => {
    const c = catId.toLowerCase();
    if (c === 'plumbing') return Droplets;
    if (c === 'electrical') return Zap;
    if (c === 'fans') return Fan;
    if (c === 'lights') return Lightbulb;
    if (c === 'tools') return Wrench;
    if (c === 'fasteners') return Hammer;
    return Package;
  };

  const categoryDefinitions = categories.map((cat) => ({
    id: cat.id,
    title: cat.name,
    code: cat.id,
    icon: getIconForCategory(cat.id),
    summary:
      cat.description ||
      `Genuine wholesale ${cat.name.toLowerCase()} materials and accessories ready for rapid 15–30 minute jobsite delivery.`,
    catalogCategory: cat.id,
    configuredSubcategories: cat.subcategories || [],
  }));

  const activeBlogPost = activePostId ? BLOG_POSTS.find(p => p.id === activePostId) || null : null;

  return (
    <div className="bg-slate-50 min-h-[70vh] border-b border-slate-200">
      {/* Sub-navigation Breadcrumb & Company Switcher Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => onNavigatePage('home')}
              className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-amber-600 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Store
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">Company</span>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-900">{pageLabels[activePage]}</span>
          </div>

          {/* Horizontal Company Page Links */}
          <nav className="flex items-center gap-4 sm:gap-6 overflow-x-auto text-xs sm:text-sm border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
            {(
              [
                { id: 'about', label: 'About us' },
                { id: 'categories', label: 'Categories' },
                { id: 'blog', label: 'Blog' },
                { id: 'faqs', label: 'FAQs' },
                { id: 'contact', label: 'Contact us' }
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActivePostId(null);
                  onNavigatePage(tab.id);
                }}
                className={`whitespace-nowrap pb-1 border-b-2 transition cursor-pointer ${
                  activePage === tab.id
                    ? 'border-amber-500 text-slate-950 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. ABOUT US PAGE                                          */}
      {/* ========================================================= */}
      {activePage === 'about' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
          {/* Hero Intro */}
          <section className="bg-gradient-to-br from-amber-50 via-white to-orange-50/60 border border-amber-200/80 text-slate-900 rounded-2xl p-6 sm:p-10 lg:p-12 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
              About Minute Materials · Hyderabad
            </p>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight mt-2 max-w-3xl leading-tight text-slate-900">
              Built to Keep Active Construction &amp; Repair Sites Moving Without Material Delays.
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-4 max-w-2xl leading-relaxed">
              Minute Materials is Hyderabad’s rapid jobsite supply network for plumbers, electricians, civil contractors, and homeowners. Operating out of our central dispatch hub at Chinthalkunta / LB Nagar Ring Road, we deliver genuine ISI-certified plumbing, electrical, and hardware supplies straight to your site gate in 15 to 30 minutes.
            </p>

            {/* Key Operational Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 mt-8 border-t border-amber-200/70">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600">15–30 Min</div>
                <div className="text-xs text-slate-500 mt-1">Express Hub Dispatch ETA</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">100% ISI</div>
                <div className="text-xs text-slate-500 mt-1">Authorized Brand Inventory</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">6 AM – 11 PM</div>
                <div className="text-xs text-slate-500 mt-1">7-Day Shift Coverage</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600">₹0 Advance</div>
                <div className="text-xs text-slate-500 mt-1">Cash or UPI at Site Gate</div>
              </div>
            </div>
          </section>

          {/* Why We Started & How Dispatch Works */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                The Jobsite Problem We Solve
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Stop Losing Skilled Labor Hours to Hardware Shop Runs
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                On any active apartment renovation, commercial fit-out, or emergency leak repair, running short of a few brass elbows, solvent tins, or MCB breakers brings the entire crew to a standstill. Sending a technician through city traffic wastes 60 to 90 minutes of paid shift time.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                We engineered Minute Materials around how tradespeople actually order in the field: browse exact sizes online, snap a photo of a handwritten slip, or request an instant 30-second callback from an experienced counter supervisor.
              </p>
            </div>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200">
              <div className="p-5 sm:p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-black flex items-center justify-center shrink-0">
                  01
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Order Your Way in Seconds</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    Add catalog items directly, upload a photo of your plumber/electrician’s paper material list for AI extraction, or call our dispatch desk directly at {storeSettings.helplineNumber}.
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-black flex items-center justify-center shrink-0">
                  02
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Double-Checked Gauge &amp; Thread Verification</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    Before sealing any dispatch bag, our counter leads cross-verify pipe diameters (1/2", 3/4", 1"), SDR ratings, and wire gauges so wrong-size mistakes never reach your site.
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-black flex items-center justify-center shrink-0">
                  03
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Express Bike or Mini-Truck Site Drop</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    Fittings, coils, and breakers dispatch immediately by two-wheeler; full 10ft/3m pipe bundles and bulk loads arrive via dedicated mini-truck. Inspect and pay via UPI or Cash on delivery.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Core Commitments */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              Our Trade Standards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Genuine ISI Brands Only</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every length of pipe, copper coil, and breaker comes from authorized distributor stock with full batch traceability—zero duplicate or underweight materials.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Truck className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Transparent Net Billing</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Clear wholesale-grade unit pricing with no surprise tax percentages added at checkout. What you see in your cart is what you pay on delivery.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
                  <span>Built for Both Pros &amp; Homeowners</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Whether you are a homeowner handing a plumber’s slip to us or a contractor managing five sites simultaneously, we coordinate directly with your technician on site.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigatePage('home')}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                Explore Store Catalog <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onOpenBookingMode('image_upload')}
                className="px-5 py-2.5 bg-white hover:bg-amber-50 text-slate-900 border border-slate-300 hover:border-amber-400 font-bold text-xs sm:text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-amber-600" /> Upload Handwritten Slip
              </button>
              <button
                type="button"
                onClick={() => onNavigatePage('contact')}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
              >
                Visit Hub &amp; Contact Dispatch
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. CATEGORIES DIRECTORY PAGE                              */}
      {/* ========================================================= */}
      {activePage === 'categories' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                Complete Trade Directory
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Material Categories &amp; Sub-Departments
              </h1>
              <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
                Select any trade department or specific subcategory below to jump straight into live stock, unit pricing, and 15–30 minute dispatch.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectCatalogCategory('all', '')}
              className="self-start md:self-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Layers className="w-4 h-4 text-slate-950" /> View Full Catalog ({products.length} Items)
            </button>
          </div>

          {/* Department Directory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categoryDefinitions.map(dept => {
              const Icon = dept.icon;
              const deptProducts = products.filter(
                p => p.category.toLowerCase() === dept.catalogCategory.toLowerCase()
              );
              const inStockCount = deptProducts.filter(p => p.stockStatus !== 'out_of_stock').length;
              const subSet = new Set<string>();
              const subcategories: string[] = [];
              const addSub = (s?: string) => {
                const clean = (s || '').trim();
                if (!clean) return;
                const key = clean.toLowerCase();
                if (!subSet.has(key)) {
                  subSet.add(key);
                  subcategories.push(clean);
                }
              };
              dept.configuredSubcategories.forEach(addSub);
              deptProducts.forEach(p => addSub(p.subcategory));

              const positivePrices = deptProducts.filter(p => p.price > 0).map(p => p.price);
              const minPrice = positivePrices.length > 0 ? Math.min(...positivePrices) : 0;

              return (
                <div
                  key={dept.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-amber-400 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-black text-slate-900">{dept.title}</h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {deptProducts.length} SKUs · {inStockCount} Ready for Immediate Dispatch
                            {minPrice > 0 ? ` · Starting ₹${minPrice.toFixed(0)}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 mt-4 leading-relaxed">
                      {dept.summary}
                    </p>

                    {/* Subcategory Direct Jump Links */}
                    {subcategories.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-slate-100">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                          Subcategories
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {subcategories.map(sub => {
                            const count = deptProducts.filter(
                              p => (p.subcategory || '').toLowerCase() === sub.toLowerCase()
                            ).length;
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => onSelectCatalogCategory(dept.catalogCategory, '', sub)}
                                className="text-xs font-semibold text-slate-700 hover:text-amber-600 transition flex items-center gap-1 cursor-pointer"
                              >
                                <span className="text-amber-500 font-bold">›</span>
                                <span>{sub}</span>
                                {count > 0 && (
                                  <span className="text-slate-400 font-normal">({count})</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onSelectCatalogCategory(dept.catalogCategory, '', 'all')}
                      className="text-xs sm:text-sm font-black text-slate-900 hover:text-amber-600 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      Browse {dept.title} <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenBookingMode('image_upload')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    >
                      Have a slip? Upload photo →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom / Unlisted Material Banner */}
          <div className="bg-amber-50 border border-amber-200 text-slate-900 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Need Painting Supplies, Sealants, or Special-Order Fittings?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                Our Chinthalkunta / LB Nagar warehouse stocks rollers, primers, waterproofing compounds, heavy gate valves, and custom reducers ready for same-trip dispatch.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onOpenBookingMode('phone_callback')}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                <Phone className="w-4 h-4" /> Request 30-Sec Callback
              </button>
              <button
                type="button"
                onClick={() => onOpenBookingMode('whatsapp_order')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" /> Ask on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. BLOG & TRADE GUIDES PAGE                               */}
      {/* ========================================================= */}
      {activePage === 'blog' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {activeBlogPost ? (
            /* Single Blog Article Reader View */
            <article className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-6">
              <button
                type="button"
                onClick={() => {
                  setActivePostId(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-600 hover:text-amber-700 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to All Trade Articles
              </button>

              <div className="space-y-3 border-b border-slate-200 pb-6">
                <p className="text-xs font-semibold text-slate-500">
                  <span className="text-amber-600 font-bold uppercase tracking-wider">{activeBlogPost.topic}</span>
                  {' · '}
                  {activeBlogPost.publishedDate}
                  {' · '}
                  {activeBlogPost.readTime}
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                  {activeBlogPost.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  By {activeBlogPost.author}
                </p>
              </div>

              <div className="space-y-8">
                {activeBlogPost.sections.map((sec, idx) => (
                  <section key={idx} className="space-y-3">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      {sec.heading}
                    </h2>
                    {sec.paragraphs.map((p, pIdx) => (
                      <p key={pIdx} className="text-sm sm:text-base text-slate-700 leading-relaxed">
                        {p}
                      </p>
                    ))}
                    {sec.checklist && sec.checklist.length > 0 && (
                      <ul className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-2.5 mt-3">
                        {sec.checklist.map((item, cIdx) => (
                          <li key={cIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Need these materials delivered to your site in 15–30 mins?
                  </p>
                  <p className="text-xs text-slate-500">
                    Order genuine ISI stock from our LB Nagar hub with zero advance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectCatalogCategory(activeBlogPost.relatedCategory, '')}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                >
                  Shop Related Materials <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </article>
          ) : (
            /* Blog Index View */
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                    Minute Materials Field Journal
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                    Contractor Guides &amp; Technical Sizing Notes
                  </h1>
                  <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
                    Practical jobsite checklists, pipe &amp; wire sizing standards, and procurement insights written by our Hyderabad dispatch leads.
                  </p>
                </div>

                {/* Topic Filter Tabs */}
                <div className="flex items-center gap-4 text-xs sm:text-sm">
                  {(['All', 'Plumbing', 'Electrical', 'Site Management'] as const).map(topic => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setSelectedTopic(topic)}
                      className={`pb-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                        selectedTopic === topic
                          ? 'border-amber-500 text-slate-950 font-extrabold'
                          : 'border-transparent text-slate-500 hover:text-slate-900 font-medium'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {BLOG_POSTS.filter(p => selectedTopic === 'All' || p.topic === selectedTopic).map(post => (
                  <article
                    key={post.id}
                    onClick={() => {
                      setActivePostId(post.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-6 flex flex-col justify-between transition cursor-pointer group"
                  >
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">
                        <span className="font-bold text-amber-600 uppercase tracking-wider">{post.topic}</span>
                        {' · '}
                        {post.publishedDate}
                        {' · '}
                        {post.readTime}
                      </p>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-600 transition leading-snug">
                        {post.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 truncate pr-2">{post.author}</span>
                      <span className="font-bold text-slate-900 group-hover:text-amber-600 inline-flex items-center gap-1 shrink-0">
                        <BookOpen className="w-3.5 h-3.5" /> Read Guide
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. FAQS PAGE                                              */}
      {/* ========================================================= */}
      {activePage === 'faqs' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
              Help &amp; Dispatch Answers
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-sm text-slate-600">
              Everything plumbers, electricians, builders, and homeowners ask about 15–30 minute delivery, slip scanning, and billing.
            </p>
          </div>

          {/* Search + Category Filter */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={faqSearch}
                onChange={e => setFaqSearch(e.target.value)}
                placeholder="Search questions (e.g., delivery time, slip upload, COD, exchange)..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-4 overflow-x-auto border-b border-slate-200 text-xs sm:text-sm">
              {(['All', 'Delivery & Areas', 'Ordering & Slip Scan', 'Pricing & Payment', 'Returns & Brands'] as const).map(
                cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFaqCategory(cat)}
                    className={`pb-2.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
                      faqCategory === cat
                        ? 'border-amber-500 text-slate-950 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-900 font-medium'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Accordion List */}
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200">
            {FAQ_ITEMS.filter(item => {
              const matchesCat = faqCategory === 'All' || item.category === faqCategory;
              const q = faqSearch.trim().toLowerCase();
              const matchesSearch =
                !q ||
                item.question.toLowerCase().includes(q) ||
                item.answer.toLowerCase().includes(q);
              return matchesCat && matchesSearch;
            }).map(item => {
              const isOpen = openFaqId === item.id;
              return (
                <div key={item.id} className="p-5 sm:p-6">
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                    className="w-full flex items-start justify-between gap-4 text-left cursor-pointer"
                  >
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
                        {item.category}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {item.question}
                      </h3>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 mt-1 transition-transform ${
                        isOpen ? 'rotate-180 text-amber-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed pr-6">
                      {item.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Direct Support Strip */}
          <div className="bg-amber-50 border border-amber-200 text-slate-900 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Still need help with a specific fitting or site order?</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Speak directly with our Chinthalkunta / LB Nagar dispatch desk.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <a
                href={`tel:${storeSettings.helplineNumber}`}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition flex items-center gap-1.5"
              >
                <Phone className="w-4 h-4" /> Call {storeSettings.helplineNumber}
              </a>
              <button
                type="button"
                onClick={() => onNavigatePage('contact')}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
              >
                Contact Us Page →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. CONTACT US PAGE                                        */}
      {/* ========================================================= */}
      {activePage === 'contact' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
              24x7 Jobsite Support &amp; Dispatch Desk
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Contact Minute Materials
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
              Reach our express dispatch supervisor directly for urgent material drops, bulk contractor quotes, or order assistance across Hyderabad.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Direct Dispatch Channels & Hub Address */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl p-6 space-y-5 shadow-xs">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Immediate Jobsite Hotline
                  </p>
                  <h2 className="text-lg font-black text-slate-900 mt-1">Direct Dispatch Channels</h2>
                </div>

                <div className="space-y-3 text-sm">
                  <a
                    href={`tel:${storeSettings.helplineNumber}`}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <CallBadgeIcon className="w-9 h-9 shrink-0" />
                      <div>
                        <span className="text-xs text-slate-500 block">Express Dispatch Phone</span>
                        <span className="font-black text-slate-900">{storeSettings.helplineNumber}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-600">Call Now →</span>
                  </a>

                  <a
                    href={generateDirectWhatsAppChatUrl(storeSettings.whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <WhatsAppBadgeIcon className="w-9 h-9 shrink-0" />
                      <div>
                        <span className="text-xs text-slate-500 block">WhatsApp Slip &amp; Quote Desk</span>
                        <span className="font-black text-slate-900">+{storeSettings.whatsappNumber}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">Chat →</span>
                  </a>

                  <a
                    href="mailto:mr.vinnu10@gmail.com"
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <GmailBadgeIcon className="w-9 h-9 shrink-0" />
                      <div>
                        <span className="text-xs text-slate-500 block">Gmail Support &amp; Bulk Quotes</span>
                        <span className="font-black text-slate-900">mr.vinnu10@gmail.com</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue-600">Email →</span>
                  </a>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-700 mb-2.5">Connect with Us:</p>
                  <div className="flex items-center gap-2.5">
                    <a
                      href={generateDirectWhatsAppChatUrl(storeSettings.whatsappNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-xs"
                      title="WhatsApp"
                      aria-label="WhatsApp"
                    >
                      <WhatsAppBadgeIcon className="w-9 h-9" />
                    </a>
                    <a
                      href="https://www.instagram.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-xs"
                      title="Instagram"
                      aria-label="Instagram"
                    >
                      <InstagramBadgeIcon className="w-9 h-9" />
                    </a>
                    <a
                      href={`tel:${storeSettings.helplineNumber}`}
                      className="rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-xs"
                      title={`Call ${storeSettings.helplineNumber}`}
                      aria-label="Call Us"
                    >
                      <CallBadgeIcon className="w-9 h-9" />
                    </a>
                    <a
                      href="mailto:mr.vinnu10@gmail.com"
                      className="rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-xs"
                      title="Gmail (mr.vinnu10@gmail.com)"
                      aria-label="Email via Gmail"
                    >
                      <GmailBadgeIcon className="w-9 h-9" />
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-3 text-xs sm:text-sm text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-1" />
                    <div>
                      <strong className="text-slate-900 block">Main Express Hub:</strong>
                      {storeSettings.depotAddress || 'Chinthalkunta / LB Nagar Ring Road, Hyderabad, Telangana 500074'}
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block">Dispatch Hours:</strong>
                      Monday – Sunday: 6:00 AM to 11:00 PM (Early-morning &amp; night emergency runs supported)
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenLocationModal}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition cursor-pointer"
                >
                  Check Live Delivery ETA to My Area
                </button>
              </div>
            </div>

            {/* Right Column: Interactive Inquiry / Support Form */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Send a Bulk Quote Request or Support Message
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Our counter team reviews incoming messages immediately and responds by phone or WhatsApp.
              </p>

              {submittedRef ? (
                <div className="mt-6 p-6 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Message Logged with Dispatch Desk</span>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
                    Thank you! Your inquiry reference is <strong className="font-mono">{submittedRef}</strong>. Our hub supervisor will reach out shortly on your provided number.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmittedRef(null)}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Your Name / Contractor Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={e => setContactName(e.target.value)}
                        placeholder="e.g., Raju Plumbing Works"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mobile / WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Topic
                      </label>
                      <select
                        value={contactType}
                        onChange={e => setContactType(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                      >
                        <option value="bulk_quote">Bulk Contractor / Builder Quote</option>
                        <option value="urgent_dispatch">Urgent Jobsite Material Inquiry</option>
                        <option value="order_support">Existing Order / Size Exchange</option>
                        <option value="partnership">Vendor / Trade Account Inquiry</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Order / Booking ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={contactOrderId}
                        onChange={e => setContactOrderId(e.target.value)}
                        placeholder="e.g., BK-1001"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Material Requirements or Message *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={contactMessage}
                      onChange={e => setContactMessage(e.target.value)}
                      placeholder="Tell us the site location, required pipe/wire list, or question..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {contactError && (
                    <p className="text-xs font-semibold text-rose-600">{contactError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingContact}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmittingContact ? 'Sending to Dispatch...' : 'Submit Message'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Embedded FAQs Section inside Contact Us Page */}
          <section className="pt-8 border-t border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                  Quick Answers Before You Call
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                  Frequently Asked Questions
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Common questions about 15–30 min jobsite dispatch, handwritten slip scanning, payment modes, and exchanges.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={faqSearch}
                  onChange={e => setFaqSearch(e.target.value)}
                  placeholder="Search FAQs..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-4 overflow-x-auto border-b border-slate-200 text-xs sm:text-sm">
              {(['All', 'Delivery & Areas', 'Ordering & Slip Scan', 'Pricing & Payment', 'Returns & Brands'] as const).map(
                cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFaqCategory(cat)}
                    className={`pb-2.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
                      faqCategory === cat
                        ? 'border-amber-500 text-slate-950 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-900 font-medium'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            {/* Expandable FAQ Accordion */}
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200">
              {FAQ_ITEMS.filter(item => {
                const matchesCat = faqCategory === 'All' || item.category === faqCategory;
                const q = faqSearch.trim().toLowerCase();
                const matchesSearch =
                  !q ||
                  item.question.toLowerCase().includes(q) ||
                  item.answer.toLowerCase().includes(q);
                return matchesCat && matchesSearch;
              }).map(item => {
                const isOpen = openFaqId === item.id;
                return (
                  <div key={item.id} className="p-5 sm:p-6">
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      className="w-full flex items-start justify-between gap-4 text-left cursor-pointer"
                    >
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
                          {item.category}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          {item.question}
                        </h3>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 shrink-0 mt-1 transition-transform ${
                          isOpen ? 'rotate-180 text-amber-600' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed pr-6">
                        {item.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
