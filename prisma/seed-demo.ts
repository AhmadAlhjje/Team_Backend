/**
 * DEVELOPMENT ONLY — sample content to preview the website with every section
 * filled: a suggested team name, team members, projects, achievements, clients
 * and testimonials.
 *
 *   npm run db:seed               base data first (admin, settings, services…)
 *   npm run db:seed:demo          this file
 *   npm run db:seed:demo:remove   delete the sample content again
 *
 * Safe to re-run: every record is matched by slug (or exact name/title) and is
 * created only when missing, so nothing edited in Admin is overwritten. Site
 * settings are filled only where they are empty or still hold the base-seed
 * placeholders. Sample slugs start with "demo-". The names, clients and quotes
 * are fictional: replace or remove them before going live. Refuses to run
 * when NODE_ENV=production.
 */
import { isForeignKeyViolation } from '../src/database/prisma-errors.js';
import type { Prisma } from '../src/generated/prisma/client.js';
import { AchievementType, ContentStatus, ProjectPhase, SocialPlatform } from '../src/generated/prisma/enums.js';
import { createSeedClient, ensureTechnologies, log } from './seed-client.js';
import { SITE_PLACEHOLDERS, STARTER_FAQS } from './seed-data.js';

if (process.env.NODE_ENV === 'production') {
  process.stderr.write('[seed:demo] Refusing to touch demo data in production.\n');
  process.exit(1);
}

const prisma = createSeedClient();

// -----------------------------------------------------------------------------
// Sample content
// -----------------------------------------------------------------------------

const DEMO_SETTINGS = {
  // Suggested name for the preview; change it from Admin → Settings.
  siteName: 'بنيان',
  heroTitle: 'نبني منتجات رقمية *متينة* تحل مشاكل حقيقية.',
  heroSubtitle:
    'فريق من المهندسين والمطورين نصمم ونبني تطبيقات الويب والموبايل والأنظمة الذكية، بكود نظيف وتجربة استخدام سلسة تُبنى لتدوم.',
  aboutTitle: 'فريق واحد، وخبرات تكمّل بعضها',
  aboutContent: [
    'بدأنا كمجموعة صغيرة من المطورين يجمعنا شغف واحد: بناء برمجيات يعتمد عليها الناس فعلاً.',
    '',
    'مع كل مشروع تعلّمنا أن المنتج الجيد لا يبدأ بالكود، بل بفهم المشكلة جيداً، ثم اختيار أبسط حل يعمل بثبات.',
    '',
    'اليوم نعمل كفريق متكامل:',
    '- مهندسو واجهات يهتمون بالتجربة والتفاصيل',
    '- مطورو أنظمة خلفية وقواعد بيانات',
    '- مطورو تطبيقات موبايل',
    '- مهتمون بحلول الذكاء الاصطناعي والبيانات',
    '',
    'نؤمن بالوضوح في التواصل، وبالجودة في التفاصيل، وبأن نبقى مع عملائنا بعد الإطلاق كما قبله.',
  ].join('\n'),
  email: 'hello@example.com',
  location: 'نعمل عن بُعد مع عملاء من مختلف الدول',
  foundedYear: 2022,
};

const DEMO_SITE_LINKS = [
  { platform: SocialPlatform.GITHUB, url: 'https://github.com' },
  { platform: SocialPlatform.LINKEDIN, url: 'https://www.linkedin.com' },
];

/** Descriptions for the starter services, used only where none was written yet. */
const DEMO_SERVICE_DETAILS: Array<{ slug: string; description: string; technologies: string[] }> = [
  {
    slug: 'web-development',
    description: [
      'نبني مواقع وتطبيقات ويب سريعة وآمنة وقابلة للتوسع:',
      '- مواقع تعريفية ومنصات متكاملة',
      '- لوحات تحكم وأنظمة داخلية',
      '- واجهات برمجية (APIs) وتكامل مع أنظمة أخرى',
      '- تحسين الأداء ومحركات البحث',
    ].join('\n'),
    technologies: [],
  },
  {
    slug: 'mobile-apps',
    description: [
      'تطبيقات Android و iOS من قاعدة كود واحدة، بأداء وتجربة قريبة من التطبيقات الأصلية:',
      '- تصميم تجربة استخدام بسيطة وواضحة',
      '- إشعارات فورية ودفع إلكتروني',
      '- لوحة تحكم وخدمات خلفية متكاملة',
      '- النشر على المتاجر والمتابعة بعد الإطلاق',
    ].join('\n'),
    technologies: ['Firebase'],
  },
  {
    slug: 'business-systems',
    description: [
      'أنظمة تنظّم عمل مؤسستك وتوفّر الوقت والجهد:',
      '- إدارة المبيعات والمخزون والفواتير',
      '- إدارة الموظفين والصلاحيات',
      '- تقارير ولوحات مؤشرات',
      '- ربط الفروع والأقسام في نظام واحد',
    ].join('\n'),
    technologies: ['NestJS', 'MySQL', 'React'],
  },
  {
    slug: 'desktop-software',
    description: [
      'برامج سطح مكتب مستقرة لنظامي Windows و macOS:',
      '- تعمل مع الإنترنت أو بدونه',
      '- مزامنة البيانات عند توفر الاتصال',
      '- تكامل مع الطابعات والأجهزة المحلية',
    ].join('\n'),
    technologies: ['Electron', 'React', 'SQLite'],
  },
  {
    slug: 'ai-solutions',
    description: [
      'ندمج الذكاء الاصطناعي حيث يضيف قيمة حقيقية:',
      '- مساعدات ذكية تجيب من بيانات شركتك',
      '- أتمتة المهام المتكررة',
      '- تحليل البيانات واستخراج المؤشرات',
      '- تصنيف النصوص والمستندات',
    ].join('\n'),
    technologies: ['Python', 'FastAPI', 'LLMs'],
  },
  {
    slug: 'custom-software',
    description: [
      'عندما لا تناسبك الحلول الجاهزة، نبني حلاً مصمماً لمشكلتك تحديداً:',
      '- دراسة المشكلة وطريقة العمل الحالية',
      '- تصميم حل بسيط وقابل للتطوير',
      '- تنفيذ على مراحل مع تسليمات واضحة',
    ].join('\n'),
    technologies: ['TypeScript', 'Node.js'],
  },
];

const DEMO_MEMBERS = [
  {
    slug: 'demo-sami',
    name: 'سامي الخطيب',
    role: 'Full-Stack Engineer',
    specialization: 'قيادة تقنية · معمارية الأنظمة',
    bio: 'يقود الجانب التقني في مشاريع الفريق: من تصميم المعمارية واختيار التقنيات إلى مراجعة الكود والإطلاق. يحب الحلول البسيطة التي تعمل بثبات.',
    skills: ['TypeScript', 'Next.js', 'NestJS', 'MySQL', 'System Design'],
  },
  {
    slug: 'demo-lina',
    name: 'لينا حداد',
    role: 'Frontend & UI Engineer',
    specialization: 'واجهات المستخدم · تجربة الاستخدام',
    bio: 'تحوّل التصاميم إلى واجهات سريعة وسهلة الاستخدام تعمل بسلاسة على كل الشاشات، مع اهتمام خاص بإمكانية الوصول والتفاصيل الصغيرة.',
    skills: ['React', 'Tailwind CSS', 'Figma', 'Accessibility'],
  },
  {
    slug: 'demo-omar',
    name: 'عمر النجار',
    role: 'Mobile Developer',
    specialization: 'تطبيقات Android و iOS',
    bio: 'يبني تطبيقات موبايل بأداء عالٍ وتجربة سلسة باستخدام Flutter، ويهتم بتكاملها مع الخدمات الخلفية والإشعارات والدفع.',
    skills: ['Flutter', 'Dart', 'Firebase', 'REST APIs'],
  },
  {
    slug: 'demo-rana',
    name: 'رنا الأحمد',
    role: 'AI & Data Engineer',
    specialization: 'الذكاء الاصطناعي · تحليل البيانات',
    bio: 'تعمل على دمج نماذج الذكاء الاصطناعي في المنتجات: من المساعدات الذكية إلى أتمتة المهام وتحليل البيانات.',
    skills: ['Python', 'LLMs', 'FastAPI', 'Data Analysis'],
  },
];

const DEMO_CLIENTS = [
  { name: 'متجر سنبلة', industry: 'تجارة إلكترونية' },
  { name: 'عيادات الرعاية', industry: 'رعاية صحية' },
  { name: 'أكاديمية مدار', industry: 'تعليم' },
  { name: 'مجموعة رواق', industry: 'خدمات لوجستية' },
];

interface DemoProject {
  slug: string;
  title: string;
  summary: string;
  category: string;
  phase: ProjectPhase;
  isFeatured: boolean;
  client: string | null;
  startDate: string;
  endDate: string | null;
  technologies: string[];
  services: string[];
  members: Array<[slug: string, contribution: string]>;
  description: string;
  problem: string;
  solution: string;
  ourRole: string;
  results: string;
  features: Array<[title: string, description: string]>;
}

const DEMO_PROJECTS: DemoProject[] = [
  {
    slug: 'demo-orders-platform',
    title: 'منصة إدارة الطلبات والمخزون',
    summary: 'منصة ويب متكاملة لاستقبال الطلبات وإدارة المخزون والتوصيل، مع لوحة تحكم لحظية لأصحاب المتجر.',
    category: 'منصة ويب',
    phase: ProjectPhase.LIVE,
    isFeatured: true,
    client: 'متجر سنبلة',
    startDate: '2025-02-01',
    endDate: '2025-07-15',
    technologies: ['Next.js', 'NestJS', 'MySQL', 'Redis'],
    services: ['web-development', 'business-systems'],
    members: [
      ['demo-sami', 'قيادة تقنية وخدمات خلفية'],
      ['demo-lina', 'الواجهات ولوحة التحكم'],
    ],
    description:
      'منصة تجمع عمليات المتجر في مكان واحد: استقبال الطلبات من الموقع، تتبع المخزون، إدارة التوصيل، وتقارير المبيعات.\n\nصُممت لتكون سريعة وسهلة لفريق المتجر حتى في أوقات الذروة.',
    problem:
      'كان المتجر يدير الطلبات عبر الهاتف والرسائل وجداول متفرقة، ما سبّب أخطاء في المخزون وتأخيراً في التوصيل وصعوبة في معرفة أرقام المبيعات الحقيقية.',
    solution:
      'بنينا منصة واحدة تربط الطلبات بالمخزون مباشرة:\n- استقبال الطلبات وتحديث المخزون تلقائياً\n- لوحة تحكم لحظية لحالة كل طلب\n- إدارة المندوبين ومسارات التوصيل\n- تقارير يومية وشهرية للمبيعات',
    ourRole:
      'تحليل المتطلبات، تصميم قاعدة البيانات والمعمارية، تطوير الواجهات والخدمات الخلفية، ثم الإطلاق والدعم المستمر.',
    results: 'أصبح فريق المتجر يدير كل الطلبات من شاشة واحدة، وصارت لدى الإدارة رؤية يومية واضحة للمخزون والمبيعات.',
    features: [
      ['تحديث المخزون لحظياً', 'كل طلب يُخصم من المخزون فور تأكيده، مع تنبيه عند اقتراب النفاد.'],
      ['لوحة تحكم لحظية', 'حالة كل طلب من الاستلام حتى التسليم في شاشة واحدة.'],
      ['إدارة التوصيل', 'توزيع الطلبات على المندوبين وتتبع حالة التوصيل.'],
      ['تقارير المبيعات', 'تقارير يومية وشهرية قابلة للتصدير.'],
    ],
  },
  {
    slug: 'demo-clinic-booking',
    title: 'تطبيق حجز المواعيد للعيادات',
    summary: 'تطبيق يتيح للمرضى حجز المواعيد وتلقي التذكيرات، مع لوحة إدارة تنظّم جداول الأطباء.',
    category: 'تطبيق موبايل',
    phase: ProjectPhase.COMPLETED,
    isFeatured: true,
    client: 'عيادات الرعاية',
    startDate: '2024-09-01',
    endDate: '2025-01-20',
    technologies: ['Flutter', 'Firebase', 'NestJS'],
    services: ['mobile-apps'],
    members: [
      ['demo-omar', 'تطوير التطبيق'],
      ['demo-sami', 'الخدمات الخلفية'],
      ['demo-lina', 'تصميم تجربة الاستخدام'],
    ],
    description:
      'تطبيق Android و iOS يربط المرضى بالعيادة: حجز الموعد المناسب خلال ثوانٍ، تذكيرات تلقائية، وسجل للزيارات السابقة.',
    problem:
      'كانت الحجوزات تتم عبر الهاتف فقط، ما يعني ضغطاً على موظفي الاستقبال، ومواعيد فائتة بسبب النسيان، وصعوبة في تنظيم جداول الأطباء.',
    solution:
      'صممنا تطبيقاً بسيطاً للمرضى ولوحة إدارة للعيادة:\n- عرض المواعيد المتاحة لكل طبيب\n- حجز وإلغاء وتعديل من التطبيق\n- تذكير تلقائي قبل الموعد\n- لوحة إدارة لجداول الأطباء',
    ourRole: 'تصميم تجربة الاستخدام، تطوير التطبيق ولوحة الإدارة، والنشر على المتاجر.',
    results: 'انتقلت معظم الحجوزات إلى التطبيق، وأصبح موظفو الاستقبال يتفرغون لخدمة المرضى داخل العيادة.',
    features: [
      ['حجز خلال ثوانٍ', 'اختيار الطبيب والوقت المناسب بخطوات قليلة.'],
      ['تذكيرات تلقائية', 'إشعار قبل الموعد لتقليل المواعيد الفائتة.'],
      ['لوحة إدارة للعيادة', 'تنظيم جداول الأطباء والإجازات.'],
    ],
  },
  {
    slug: 'demo-support-assistant',
    title: 'مساعد ذكي لخدمة العملاء',
    summary: 'مساعد يعتمد على الذكاء الاصطناعي يجيب عن أسئلة العملاء من قاعدة معرفة الشركة على مدار الساعة.',
    category: 'ذكاء اصطناعي',
    phase: ProjectPhase.IN_PROGRESS,
    isFeatured: true,
    client: null,
    startDate: '2026-03-01',
    endDate: null,
    technologies: ['Python', 'FastAPI', 'LLMs', 'Next.js'],
    services: ['ai-solutions'],
    members: [
      ['demo-rana', 'نماذج الذكاء الاصطناعي'],
      ['demo-lina', 'واجهة المحادثة'],
    ],
    description:
      'مساعد محادثة يفهم أسئلة العملاء ويجيب اعتماداً على مستندات الشركة وسياساتها، ويحوّل المحادثة إلى موظف عند الحاجة.',
    problem: 'تتكرر أسئلة العملاء نفسها يومياً، ويضيع وقت فريق الدعم في الإجابة عنها بدل حل المشكلات الأصعب.',
    solution:
      'نبني مساعداً ذكياً مربوطاً بقاعدة معرفة الشركة:\n- إجابات من مستندات الشركة فقط\n- تحويل المحادثة إلى موظف عند الحاجة\n- لوحة لمراجعة المحادثات وتحسين الإجابات',
    ourRole: 'تصميم الحل، بناء خط معالجة المستندات، تطوير واجهة المحادثة ولوحة المراجعة.',
    results: 'المشروع قيد التطوير حالياً، والنسخة التجريبية تُختبر مع فريق الدعم.',
    features: [
      ['إجابات من مصادر موثوقة', 'يعتمد على مستندات الشركة ويذكر مصدر الإجابة.'],
      ['تحويل ذكي إلى موظف', 'عندما لا يعرف الإجابة يحوّل المحادثة فوراً.'],
      ['لوحة مراجعة', 'متابعة المحادثات وتحسين الإجابات باستمرار.'],
    ],
  },
  {
    slug: 'demo-learning-platform',
    title: 'منصة تعليمية تفاعلية',
    summary: 'منصة دورات أونلاين مع اختبارات تفاعلية ومتابعة لتقدم الطلاب ولوحة تحكم للمدربين.',
    category: 'منصة ويب',
    phase: ProjectPhase.LIVE,
    isFeatured: true,
    client: 'أكاديمية مدار',
    startDate: '2025-08-01',
    endDate: '2026-01-10',
    technologies: ['Next.js', 'NestJS', 'MySQL'],
    services: ['web-development'],
    members: [
      ['demo-lina', 'الواجهات وتجربة التعلم'],
      ['demo-sami', 'الخدمات الخلفية'],
      ['demo-omar', 'نسخة الموبايل'],
    ],
    description:
      'منصة تجمع الدروس المرئية والاختبارات والشهادات في تجربة واحدة سلسة، مع لوحة للمدربين لمتابعة تقدم الطلاب.',
    problem: 'كانت الأكاديمية تعتمد على مجموعات المراسلة لنشر الدروس، دون طريقة واضحة لمتابعة تقدم الطلاب أو تقييمهم.',
    solution:
      'بنينا منصة تعليمية متكاملة:\n- دورات مقسمة إلى وحدات ودروس\n- اختبارات تفاعلية بتصحيح تلقائي\n- شهادات إتمام\n- لوحة للمدربين لمتابعة الطلاب',
    ourRole: 'تحليل المتطلبات، تصميم التجربة، تطوير المنصة ولوحة المدربين، والإطلاق.',
    results: 'أصبح لدى الأكاديمية منصة خاصة بها، ويتابع المدربون تقدم كل طالب بوضوح.',
    features: [
      ['اختبارات تفاعلية', 'أسئلة متنوعة مع تصحيح تلقائي ونتائج فورية.'],
      ['متابعة التقدم', 'نسبة الإنجاز لكل طالب في كل دورة.'],
      ['شهادات إتمام', 'تُصدر تلقائياً عند إكمال الدورة.'],
    ],
  },
  {
    slug: 'demo-warehouse-system',
    title: 'نظام إدارة المستودعات',
    summary: 'برنامج سطح مكتب لإدارة المستودعات والحركات والجرد، يعمل بدون إنترنت ويزامن البيانات عند الاتصال.',
    category: 'نظام إداري',
    phase: ProjectPhase.COMPLETED,
    isFeatured: false,
    client: 'مجموعة رواق',
    startDate: '2024-03-01',
    endDate: '2024-08-30',
    technologies: ['Electron', 'React', 'SQLite'],
    services: ['desktop-software', 'business-systems'],
    members: [
      ['demo-sami', 'المعمارية والمزامنة'],
      ['demo-lina', 'الواجهات'],
    ],
    description:
      'نظام لإدارة عدة مستودعات: الوارد والصادر والتحويلات والجرد الدوري، مع صلاحيات لكل موظف وتقارير تفصيلية.',
    problem:
      'كانت المستودعات تعمل في مناطق باتصال إنترنت ضعيف، وتُسجّل الحركات على الورق ثم تُنقل يدوياً، ما يسبب أخطاء وتأخيراً في الجرد.',
    solution:
      'برنامج سطح مكتب يعمل بدون إنترنت:\n- تسجيل الحركات محلياً\n- مزامنة تلقائية عند توفر الاتصال\n- جرد دوري بالباركود\n- تقارير لكل مستودع',
    ourRole: 'تصميم المعمارية وآلية المزامنة، تطوير البرنامج، وتدريب الموظفين.',
    results: 'انتهى الاعتماد على الورق، وأصبح الجرد أسرع وأدق في كل المستودعات.',
    features: [
      ['يعمل بدون إنترنت', 'تسجيل كل الحركات محلياً بدون انقطاع.'],
      ['مزامنة تلقائية', 'تُرفع البيانات فور عودة الاتصال.'],
      ['جرد بالباركود', 'جرد أسرع وأدق باستخدام قارئ الباركود.'],
    ],
  },
  {
    slug: 'demo-sales-analytics',
    title: 'لوحة تحليلات المبيعات',
    summary: 'لوحة مؤشرات تجمع بيانات المبيعات من عدة مصادر وتعرضها برسوم واضحة وتنبيهات ذكية.',
    category: 'لوحة بيانات',
    phase: ProjectPhase.LIVE,
    isFeatured: false,
    client: null,
    startDate: '2025-10-01',
    endDate: '2026-02-15',
    technologies: ['Next.js', 'Python', 'MySQL'],
    services: ['ai-solutions', 'web-development'],
    members: [
      ['demo-rana', 'تحليل البيانات'],
      ['demo-sami', 'الخدمات الخلفية'],
    ],
    description:
      'لوحة تجمع بيانات المبيعات والمخزون والعملاء في مكان واحد، وتنبّه الإدارة إلى التغيرات المهمة قبل أن تتحول إلى مشكلات.',
    problem: 'كانت البيانات موزعة بين عدة أنظمة وجداول، ويستغرق إعداد تقرير واحد أياماً.',
    solution:
      'بنينا طبقة بيانات موحدة ولوحة مؤشرات:\n- ربط مصادر البيانات المختلفة\n- رسوم بيانية واضحة وقابلة للتصفية\n- تنبيهات عند التغيرات غير المعتادة',
    ourRole: 'تحليل مصادر البيانات، بناء خط المعالجة، وتطوير لوحة المؤشرات.',
    results: 'أصبحت التقارير متاحة لحظياً بدل إعدادها يدوياً، وصارت القرارات تعتمد على أرقام محدّثة.',
    features: [
      ['مصادر بيانات موحدة', 'كل الأرقام في مكان واحد.'],
      ['تنبيهات ذكية', 'إشعار عند التغيرات غير المعتادة في المبيعات.'],
    ],
  },
];

const DEMO_ACHIEVEMENTS = [
  {
    title: 'المركز الأول في هاكاثون الحلول الرقمية',
    type: AchievementType.COMPETITION,
    issuer: 'هاكاثون تقني محلي',
    highlight: 'المركز الأول',
    date: '2025-05-10',
    project: 'demo-orders-platform',
    description: 'فزنا بالمركز الأول بفكرة منصة إدارة الطلبات، ثم تحولت الفكرة إلى منتج يعمل فعلياً.',
  },
  {
    title: 'جائزة أفضل تجربة استخدام',
    type: AchievementType.AWARD,
    issuer: 'مسابقة تطبيقات الموبايل',
    highlight: 'أفضل تجربة استخدام',
    date: '2025-03-22',
    project: 'demo-clinic-booking',
    description: 'تقديراً لبساطة تطبيق حجز المواعيد وسهولة استخدامه لمختلف الأعمار.',
  },
  {
    title: 'شهادة معتمدة في الحوسبة السحابية',
    type: AchievementType.CERTIFICATION,
    issuer: 'مزوّد خدمات سحابية',
    highlight: null,
    date: '2024-11-01',
    project: null,
    description: 'حصل أعضاء الفريق على شهادة في تصميم ونشر التطبيقات على البنية السحابية.',
  },
  {
    title: 'إطلاق أول منتج للعملاء',
    type: AchievementType.MILESTONE,
    issuer: null,
    highlight: 'بداية الرحلة',
    date: '2023-06-01',
    project: null,
    description: 'أطلقنا أول منتج لعميل حقيقي، وبدأت معه رحلة الفريق.',
  },
];

const DEMO_TESTIMONIALS = [
  {
    authorName: 'خالد م.',
    authorTitle: 'مدير العمليات',
    company: 'متجر سنبلة',
    project: 'demo-orders-platform',
    content:
      'كنا نضيع ساعات يومياً في متابعة الطلبات يدوياً. اليوم كل شيء في مكان واحد، والفريق كان واضحاً معنا في كل مرحلة من البداية حتى الإطلاق.',
  },
  {
    authorName: 'د. ريم س.',
    authorTitle: 'مديرة العيادة',
    company: 'عيادات الرعاية',
    project: 'demo-clinic-booking',
    content:
      'التطبيق سهّل على مرضانا حجز المواعيد، وقلّت المواعيد الفائتة بعد إضافة التذكيرات. تعامل احترافي وسرعة في الاستجابة.',
  },
  {
    authorName: 'أحمد ع.',
    authorTitle: 'مؤسس',
    company: 'أكاديمية مدار',
    project: 'demo-learning-platform',
    content:
      'فهموا فكرتنا بسرعة وحوّلوها إلى منصة جميلة وسهلة الاستخدام. والأهم أنهم بقوا معنا بعد الإطلاق لتطويرها باستمرار.',
  },
];

// -----------------------------------------------------------------------------
// Insert
// -----------------------------------------------------------------------------

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function fillSettings(): Promise<void> {
  const settings = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  if (!settings) throw new Error('Site settings are missing — run `npm run db:seed` first.');

  const data: Prisma.SiteSettingUpdateInput = {};
  if (settings.siteName === SITE_PLACEHOLDERS.siteName) data.siteName = DEMO_SETTINGS.siteName;
  if (!settings.aboutContent || settings.aboutContent === SITE_PLACEHOLDERS.aboutContent) {
    data.aboutContent = DEMO_SETTINGS.aboutContent;
  }
  for (const key of ['heroTitle', 'heroSubtitle', 'aboutTitle', 'email', 'location'] as const) {
    if (!settings[key]) data[key] = DEMO_SETTINGS[key];
  }
  if (settings.foundedYear === null) data.foundedYear = DEMO_SETTINGS.foundedYear;

  if (Object.keys(data).length) await prisma.siteSetting.update({ where: { id: 1 }, data });

  if ((await prisma.socialLink.count({ where: { teamMemberId: null } })) === 0) {
    await prisma.socialLink.createMany({
      data: DEMO_SITE_LINKS.map((link, sortOrder) => ({ ...link, sortOrder })),
    });
  }
  log(`Settings: filled ${Object.keys(data).length} empty or placeholder field(s).`);
}

async function fillServices(): Promise<void> {
  for (const detail of DEMO_SERVICE_DETAILS) {
    const service = await prisma.service.findUnique({
      where: { slug: detail.slug },
      select: { id: true, description: true, _count: { select: { technologies: true } } },
    });
    if (!service) continue;
    if (!service.description) {
      await prisma.service.update({ where: { id: service.id }, data: { description: detail.description } });
    }
    if (service._count.technologies === 0 && detail.technologies.length) {
      const ids = await ensureTechnologies(prisma, detail.technologies);
      await prisma.serviceTechnology.createMany({
        data: ids.map((technologyId, sortOrder) => ({ serviceId: service.id, technologyId, sortOrder })),
      });
    }
  }
  const published = await prisma.faq.updateMany({
    where: { status: ContentStatus.DRAFT, question: { in: STARTER_FAQS.map(([question]) => question) } },
    data: { status: ContentStatus.PUBLISHED },
  });
  log(`Services: descriptions filled. Starter FAQs published: ${published.count}.`);
}

async function ensureMembers(): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  let created = 0;
  for (const [sortOrder, member] of DEMO_MEMBERS.entries()) {
    const existing = await prisma.teamMember.findUnique({ where: { slug: member.slug }, select: { id: true } });
    if (existing) {
      ids.set(member.slug, existing.id);
      continue;
    }
    const { skills, ...fields } = member;
    const record = await prisma.teamMember.create({
      data: {
        ...fields,
        status: ContentStatus.PUBLISHED,
        sortOrder,
        skills: { create: skills.map((name, order) => ({ name, sortOrder: order })) },
        socialLinks: {
          create: [
            { platform: SocialPlatform.GITHUB, url: 'https://github.com', sortOrder: 0 },
            { platform: SocialPlatform.LINKEDIN, url: 'https://www.linkedin.com', sortOrder: 1 },
          ],
        },
      },
    });
    ids.set(member.slug, record.id);
    created += 1;
  }
  log(`Team: ${created} member(s) created.`);
  return ids;
}

async function ensureClients(): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  for (const [sortOrder, client] of DEMO_CLIENTS.entries()) {
    const existing = await prisma.client.findFirst({ where: { name: client.name }, select: { id: true } });
    const record =
      existing ??
      (await prisma.client.create({
        data: { ...client, hasDisplayConsent: true, status: ContentStatus.PUBLISHED, sortOrder },
      }));
    ids.set(client.name, record.id);
  }
  return ids;
}

async function ensureProjects(members: Map<string, number>, clients: Map<string, number>): Promise<void> {
  const services = await prisma.service.findMany({ select: { id: true, slug: true } });
  const serviceIds = new Map(services.map((service) => [service.slug, service.id]));
  let created = 0;

  for (const [sortOrder, project] of DEMO_PROJECTS.entries()) {
    if (await prisma.project.findUnique({ where: { slug: project.slug }, select: { id: true } })) continue;

    const {
      technologies,
      services: serviceSlugs,
      members: team,
      features,
      client,
      startDate,
      endDate,
      ...fields
    } = project;
    const technologyIds = await ensureTechnologies(prisma, technologies);
    const linkedServices = serviceSlugs.flatMap((slug) => serviceIds.get(slug) ?? []);

    await prisma.project.create({
      data: {
        ...fields,
        startDate: toDate(startDate),
        endDate: endDate ? toDate(endDate) : null,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
        sortOrder,
        clientId: client ? (clients.get(client) ?? null) : null,
        technologies: { create: technologyIds.map((technologyId, order) => ({ technologyId, sortOrder: order })) },
        services: { create: linkedServices.map((serviceId) => ({ serviceId })) },
        members: {
          create: team.flatMap(([slug, role], order) => {
            const teamMemberId = members.get(slug);
            return teamMemberId ? [{ teamMemberId, role, sortOrder: order }] : [];
          }),
        },
        features: {
          create: features.map(([title, description], order) => ({ title, description, sortOrder: order })),
        },
      },
    });
    created += 1;
  }
  log(`Projects: ${created} project(s) created.`);
}

async function ensureAchievementsAndTestimonials(): Promise<void> {
  const projects = await prisma.project.findMany({
    where: { slug: { in: DEMO_PROJECTS.map((project) => project.slug) } },
    select: { id: true, slug: true },
  });
  const projectId = (slug: string | null) => (slug ? (projects.find((p) => p.slug === slug)?.id ?? null) : null);

  let achievements = 0;
  for (const [sortOrder, { project, date, ...achievement }] of DEMO_ACHIEVEMENTS.entries()) {
    if (await prisma.achievement.findFirst({ where: { title: achievement.title }, select: { id: true } })) continue;
    await prisma.achievement.create({
      data: {
        ...achievement,
        date: toDate(date),
        projectId: projectId(project),
        status: ContentStatus.PUBLISHED,
        sortOrder,
      },
    });
    achievements += 1;
  }

  let testimonials = 0;
  for (const [sortOrder, { project, ...testimonial }] of DEMO_TESTIMONIALS.entries()) {
    const existing = await prisma.testimonial.findFirst({
      where: { authorName: testimonial.authorName, content: testimonial.content },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.testimonial.create({
      data: {
        ...testimonial,
        hasDisplayConsent: true,
        projectId: projectId(project),
        status: ContentStatus.PUBLISHED,
        sortOrder,
      },
    });
    testimonials += 1;
  }
  log(`Achievements: ${achievements} created. Testimonials: ${testimonials} created.`);
}

async function seedDemo(): Promise<void> {
  await fillSettings();
  await fillServices();
  const members = await ensureMembers();
  const clients = await ensureClients();
  await ensureProjects(members, clients);
  await ensureAchievementsAndTestimonials();
  log('Demo content ready. Remove it any time with `npm run db:seed:demo:remove`.');
}

// -----------------------------------------------------------------------------
// Remove
// -----------------------------------------------------------------------------

/** Deletes one record at a time so records linked to real content are kept. */
async function deleteEach(label: string, deletions: Array<() => Promise<unknown>>): Promise<number> {
  let deleted = 0;
  for (const remove of deletions) {
    try {
      await remove();
      deleted += 1;
    } catch (error) {
      if (!isForeignKeyViolation(error)) throw error;
      log(`${label}: one record is linked to other content — kept.`);
    }
  }
  return deleted;
}

async function removeDemo(): Promise<void> {
  const testimonials = await prisma.testimonial.deleteMany({
    where: { OR: DEMO_TESTIMONIALS.map(({ authorName, content }) => ({ authorName, content })) },
  });
  const achievements = await prisma.achievement.deleteMany({
    where: { title: { in: DEMO_ACHIEVEMENTS.map((achievement) => achievement.title) } },
  });
  const projects = await prisma.project.deleteMany({
    where: { slug: { in: DEMO_PROJECTS.map((project) => project.slug) } },
  });

  const clients = await prisma.client.findMany({
    where: { name: { in: DEMO_CLIENTS.map((client) => client.name) } },
    select: { id: true },
  });
  const deletedClients = await deleteEach(
    'Clients',
    clients.map(
      ({ id }) =>
        () =>
          prisma.client.delete({ where: { id } }),
    ),
  );

  const members = await prisma.teamMember.findMany({
    where: { slug: { in: DEMO_MEMBERS.map((member) => member.slug) } },
    select: { id: true },
  });
  const deletedMembers = await deleteEach(
    'Team',
    members.map(
      ({ id }) =>
        () =>
          prisma.teamMember.delete({ where: { id } }),
    ),
  );

  // Put back the base placeholders where the demo values were never edited.
  const settings = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  if (settings) {
    const data: Prisma.SiteSettingUpdateInput = {};
    if (settings.siteName === DEMO_SETTINGS.siteName) data.siteName = SITE_PLACEHOLDERS.siteName;
    if (settings.aboutContent === DEMO_SETTINGS.aboutContent) data.aboutContent = SITE_PLACEHOLDERS.aboutContent;
    for (const key of ['heroTitle', 'heroSubtitle', 'aboutTitle', 'email', 'location'] as const) {
      if (settings[key] === DEMO_SETTINGS[key]) data[key] = null;
    }
    if (settings.foundedYear === DEMO_SETTINGS.foundedYear) data.foundedYear = null;
    if (Object.keys(data).length) await prisma.siteSetting.update({ where: { id: 1 }, data });
  }
  await prisma.socialLink.deleteMany({
    where: { teamMemberId: null, OR: DEMO_SITE_LINKS.map(({ platform, url }) => ({ platform, url })) },
  });
  for (const detail of DEMO_SERVICE_DETAILS) {
    await prisma.service.updateMany({
      where: { slug: detail.slug, description: detail.description },
      data: { description: null },
    });
  }

  log(
    `Removed ${projects.count} project(s), ${deletedMembers} member(s), ${deletedClients} client(s), ` +
      `${achievements.count} achievement(s) and ${testimonials.count} testimonial(s).`,
  );
}

(process.argv.includes('--remove') ? removeDemo() : seedDemo())
  .catch((error: unknown) => {
    process.stderr.write(`[seed:demo] Failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
