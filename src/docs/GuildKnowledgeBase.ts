/**
 * GUILD KNOWLEDGE BASE (THE CONSTITUTION OF GUILD)
 * 
 * This file is the single canonical source of truth for the Guild platform.
 * It serves as the architecture design, brand guidelines, database schema reference,
 * data flow specification, and implementation constitution for both humans and AI agents.
 * 
 * RULES FOR FUTURE EDITORS (HUMAN OR AI):
 * 1. DO NOT add React components, JSX, Firebase calls, hooks, or side effects to this file.
 * 2. DO NOT modify platform philosophy, term glossary, or "Things Never To Do" without explicit permission.
 * 3. Keep this file updated as features transition from "planned" to "production".
 */

export interface PlatformConfig {
  productName: string;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  mission: string;
  vision: string;
  whyExists: string;
  problemsSolved: string[];
  differentiation: string[];
}

export interface PhilosophyConfig {
  corePrinciples: string[];
  truthVerificationLoop: string;
  reputationOverClaims: string;
}

export interface BrandConfig {
  voice: string;
  toneStyleRules: string[];
  designAesthetic: string;
  animationPhilosophy: string;
  colorPaletteTokens: Record<string, string>;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  rationale: string;
}

export interface ArchitectureConfig {
  highLevelArchitecture: string;
  frontendStack: string[];
  backendStack: string[];
  firestoreDesignPattern: string;
  authenticationMechanism: string;
  permissionModel: string;
  repositoryPattern: string;
  servicesArchitecture: string;
  sharedUtilities: string[];
}

export interface DataFlowConfig {
  userRegistration: string[];
  organizationRegistration: string[];
  needQuestOutcomeCycle: string[];
  questApprovalFlow: string[];
  xpFlow: string[];
  rankProgression: string[];
  passportUpdateFlow: string[];
  notifications: string[];
  paymentFlow: string[];
}

export interface RoleConfig {
  name: string;
  purpose: string;
  responsibilities: string[];
  permissions: string[];
  typicalWorkflow: string[];
}

export interface CollectionConfig {
  name: string;
  purpose: string;
  owner: string;
  relationships: string[];
  importantFields: Record<string, string>;
  readers: string[];
  writers: string[];
}

export interface BusinessConfig {
  targetAudience: string[];
  valueProposition: string;
  usp: string;
  competitors: string[];
  whyGuildWins: string;
}

export interface MarketingConfig {
  thirtySecondExplanation: string;
  twoMinuteExplanation: string;
  elevatorPitch: string;
  faq: Record<string, string>;
}

export interface LegalConfig {
  termsClarification: Record<string, string>;
  disclaimers: string[];
}

export interface DecisionLogEntry {
  title: string;
  reason: string;
  alternativeConsidered?: string;
}

export interface AIInstructionConfig {
  beforeChangingCode: string[];
  refactoringRules: string[];
  verificationGuidelines: string[];
}

export interface ExtensionPoint {
  system: string;
  description: string;
  recommendedPattern: string;
}

export interface GuildKnowledgeBaseSchema {
  platform: PlatformConfig;
  philosophy: PhilosophyConfig;
  brand: BrandConfig;
  terminology: GlossaryTerm[];
  architecture: ArchitectureConfig;
  canonicalSources: Record<string, string>;
  firestoreCollections: Record<string, CollectionConfig>;
  workflows: DataFlowConfig;
  userJourneys: Record<string, string[]>;
  roles: Record<string, RoleConfig>;
  business: BusinessConfig;
  marketing: MarketingConfig;
  legal: LegalConfig;
  roadmap: Record<string, string[]>;
  decisionLog: DecisionLogEntry[];
  aiGuidance: AIInstructionConfig;
  neverDo: string[];
  featureStatus: Record<string, 'production' | 'foundation-ready' | 'in-progress' | 'planned'>;
  futureExtensionPoints: ExtensionPoint[];
}

export const GuildKnowledgeBase: GuildKnowledgeBaseSchema = {
  platform: {
    productName: "Guild",
    tagline: "The Civilization-Oriented Work Verification Platform",
    shortDescription: "A sovereign reputation engine and verified contribution network designed to map human talent to real-world needs, verifying accomplishments directly on an unalterable ledger of verified work.",
    longDescription: "Guild is not a talent marketplace, job board, or social network. It is a civilizational coordination layer. By restructuring tasks into structured 'Needs' and 'Quests', Guild acts as an intermediary that guides contributors through verified work paths, producing durable 'Proof of Work'. This proof registers directly onto the contributor's Guild Passport, building a cryptographically sound, peer-reviewed, and organization-certified record of true capability and impact.",
    mission: "To establish a highly legible, truth-based reputation ledger for human achievement, freeing the global workforce from CV inflation, credentialism, and unreliable hiring networks.",
    vision: "A world coordinated by direct value creation, where a contributor's verified accomplishments are globally legible, liquid, and immediately usable for solving humanity's most pressing challenges.",
    whyExists: "Traditional resume platforms, degrees, and references are failing under systemic credential inflation and generative AI noise. Guild exists to restore objectivity to work history by requiring every contribution to be linked to a structural Need, verified by an active Officer (Receptionist), and certified by a host organization.",
    problemsSolved: [
      "Credential inflation and CV fraud.",
      "High transaction and evaluation costs in hiring builders.",
      "Lack of real-world project portfolios for students and career-transitioners.",
      "Incoherence in tracking volunteer and open-source impact.",
      "Hiring noise generated by unverified talent claims."
    ],
    differentiation: [
      "Upwork/Fiverr are transaction-focused market boards; Guild is a lifetime reputation system built around proof of work.",
      "LinkedIn relies on self-reported claims; Guild relies on ledger-based, officer-verified milestones.",
      "Traditional universities grant static credentials; Guild provides dynamic, action-oriented, and progressive Ranks.",
      "Guild utilizes a double-loop verification system combining organizational sign-off and Guild Representative validation."
    ]
  },
  philosophy: {
    corePrinciples: [
      "Value is demonstrated, not claimed.",
      "Trust is built through structural accountability, rigorous peer and institutional verification, and progressive rank ascension.",
      "The ledger of work must remain an objective record of real-world outcomes.",
      "Reputation belongs to the individual contributor (sovereign identity)."
    ],
    truthVerificationLoop: "Every entry on the Guild Passport must originate from an objective submission that has successfully navigated the double-loop verification workflow: first validated by the organization that needed it, then audited by a neutral Guild Representative.",
    reputationOverClaims: "We believe resumes are relics of a low-trust past. The future of talent coordination belongs to active, verified, dynamic portfolios where skills are verified by real deliverables rather than self-declared tags."
  },
  brand: {
    voice: "Premium, cinematic, authoritative, and focused on hard truth. Guild rejects corporate buzzwords, excessive hype, and generic HR speak. Wording should evoke the weight of ancient guilds updated for a high-tech civilization.",
    toneStyleRules: [
      "Use active, consequence-driven language.",
      "Maintain a dark/light contrast in tone — serious about truth, clear about achievements.",
      "Emphasize metrics, outcomes, and proof over claims.",
      "Avoid corporate filler (e.g., 'synergy', 'disruptive', 'human resource')."
    ],
    designAesthetic: "Obsidian dark backgrounds, thin contrasting panel borders, micro-animations, glassmorphism, and gold/amber highlights representing prestige and verified accomplishment.",
    animationPhilosophy: "Strictly limited to micro-animations (subtle hover scales, clean fade-ups, smooth page transitions) to maintain a premium feel. Avoid cartoonish or bouncy transitions.",
    colorPaletteTokens: {
      "primary": "var(--primary) - Golden accent representing achievement and verified status.",
      "card": "var(--card) - Sleek, dark-mode panel gray for clean layouts.",
      "border": "var(--border) - Subtle, thin contrast lines defining containers.",
      "accent": "var(--accent) - Vibrant contrasting details for actionable elements."
    }
  },
  terminology: [
    { term: "Guild", definition: "The global platform, trust network, and reputation layer.", rationale: "Establishes the sovereign identity of the platform." },
    { term: "Quest", definition: "A discrete unit of work derived from an organization's Need with clear deliverables, XP, and reputation rewards.", rationale: "Ensures work is treated as an active, prestigious task rather than a corporate job or gig." },
    { term: "Need", definition: "An raw organizational demand or problem statement which must be submitted, vetted, and scoped before transitioning into active Quests.", rationale: "Focuses contributors on solving real-world friction rather than taking arbitrary briefs." },
    { term: "Outcome", definition: "The verified output or product generated by a completed Quest.", rationale: "Shifts emphasis from hours worked to value delivered." },
    { term: "Guild Passport", definition: "The contributor's complete, verified public profile representing their total verified achievements, Ranks, and Proof of Work.", rationale: "Represents a sovereign, non-transferable credential ledger." },
    { term: "Guild Card", definition: "The visual, premium credential card representing the Passport status, complete with QR code for quick scanning and identity verification.", rationale: "Provides a quick physical and digital branding credential." },
    { term: "Guild Rank", definition: "The tier of progression (e.g., Rank F to Rank S) representing a contributor's standing and capabilities.", rationale: "Gamifies and structures contribution levels." },
    { term: "XP", definition: "Experience Points earned through Quest completions that act as the fuel for Rank progression.", rationale: "Quantifies the total volume and complexity of verified work." },
    { term: "Reputation", definition: "A directional score reflecting reliability, quality of execution, and peer trust.", rationale: "Measures quality, commitment, and platform trust." },
    { term: "Branch", definition: "A localized chapter or sector of Guild (e.g., regional hubs, college campuses) that coordinates work locally.", rationale: "Allows local scaling without losing centralized standards." },
    { term: "Verification", definition: "A dual-approval process verifying that work was delivered to specification, certified by both the target organization and the Guild network.", rationale: "Maintains absolute integrity of the ledger." }
  ],
  architecture: {
    highLevelArchitecture: "Guild uses a client-heavy React architecture that communicates with Firebase Firestore as a real-time ledger, coordinated through a structured repository layer and auth context.",
    frontendStack: ["React (Vite)", "TypeScript", "Tailwind CSS / CSS Variables", "Lucide Icons"],
    backendStack: ["Firebase Auth", "Firestore Database", "Firebase Cloud Storage"],
    firestoreDesignPattern: "Documents contain denormalized relationship arrays for rapid indexing, accompanied by subcollections or parallel collections representing transactions (e.g., questApplications).",
    authenticationMechanism: "Federated email/password and social login using Firebase Auth. Tokens are verified client-side using React Context.",
    permissionModel: "Role-based access control (RBAC). Roles are stored inside the user's Firestore document. Security rules validate claims on read/write.",
    repositoryPattern: "Centralized in `src/lib/repository.ts`. Frontend components must NOT query Firestore directly; they must call repository functions (e.g., `fetchQuests()`, `applyForQuest()`) to ensure consistent data structures and audit logging.",
    servicesArchitecture: "Stateless services managing calculation logic (e.g., `calculateProfileScore`, `meetsVerificationRequirement`) and state transitions (e.g., `updateParticipationStatus`).",
    sharedUtilities: ["src/lib/guildIdentity.ts", "src/lib/ecosystemLinks.ts", "src/components/SEO.tsx"]
  },
  canonicalSources: {
    currentUser: "users collection",
    organization: "organizations collection",
    guildPassport: "users collection",
    questVerification: "quests collection (via evaluation and verification outcomes)",
    rankProgression: "calculateProfileScore & getVerificationRequirement services",
    payments: "payments collection (future implementation module)"
  },
  firestoreCollections: {
    users: {
      name: "users",
      purpose: "Stores profile data, capabilities, Ranks, XP, and activity history for all network participants.",
      owner: "User / Contributor",
      relationships: ["Linked to organizations (if owner/rep)", "Referenced in quest applications", "Associated with quest participations"],
      importantFields: {
        "fullName": "Name of the participant",
        "role": "System role (contributor, receptionist, stateGuildMaster, etc.)",
        "xp": "Current Experience Points",
        "rank": "Current Guild Rank (F, E, D, C, B, A, S)",
        "skills": "Array of verified skill tags",
        "pathSelected": "Development path (builder, creator, operator, etc.)",
        "activityHistory": "Log array of historical profile actions"
      },
      readers: ["All authenticated users", "Public (restricted profile parameters)"],
      writers: ["User (self-profile fields)", "Guild Representative (rank updates, verification status)"]
    },
    organizations: {
      name: "organizations",
      purpose: "Stores metadata, category, trust level, verification status, and representative links for organizations.",
      owner: "Organization Representative",
      relationships: ["Linked to ownerId (users collection)", "Parent of needs collection"],
      importantFields: {
        "name": "Organization title",
        "verificationStatus": "Status (pending, verified, rejected)",
        "trustLevel": "Level (new, trusted, verified, premium)",
        "currentStatus": "Journey stage (new, contacted, active, trusted, partner)",
        "category": "Sector classification (NGO, Business, NGO, College, etc.)",
        "assignedReceptionistId": "Assigned manager ID"
      },
      readers: ["All authenticated users", "Public (profiles marked public)"],
      writers: ["Organization Representative (profile details)", "Receptionist / Guild Representative (verification, status, trust level)"]
    },
    needs: {
      name: "needs",
      purpose: "Stores raw problem statements, budgets, priority levels, and category classification posted by organizations.",
      owner: "Organization Representative",
      relationships: ["Belongs to organizationId", "Referenced by spawned quests"],
      importantFields: {
        "title": "Need name",
        "status": "State (submitted, underReview, accepted, closed, etc.)",
        "budgetRange": "Resource tier (under5k, 5k-25k, volunteer, etc.)",
        "priority": "Urgency (low, medium, high, critical)"
      },
      readers: ["All authenticated users", "Receptionists (need vetting queue)"],
      writers: ["Organization Representative (creation, updates)", "Receptionist (status transition)"]
    },
    quests: {
      name: "quests",
      purpose: "Stores active, structured work parameters, XP rewards, difficulty metrics, and evidence submissions.",
      owner: "Guild network / Host Organization",
      relationships: ["Belongs to organizationId", "Linked to parent needId", "Linked to assignedReceptionistId"],
      importantFields: {
        "title": "Quest name",
        "status": "State (draft, active, underReview, completed, paused)",
        "xpReward": "XP point reward",
        "difficulty": "Tier (easy, medium, hard, legendary)",
        "mode": "Location type (Remote, Physical, Hybrid)",
        "acceptedMembers": "Array of assigned contributor user IDs"
      },
      readers: ["All authenticated users", "Public (active quest list)"],
      writers: ["Receptionist (creation, status update)", "Organization Representative (status update, evaluation)", "Guild Representative (approval)"]
    },
    questApplications: {
      name: "questApplications",
      purpose: "Tracks individual application requests submitted by contributors wishing to work on active quests.",
      owner: "Contributor (Applicant)",
      relationships: ["Linked to questId", "Linked to applicantId"],
      importantFields: {
        "status": "State (pending, accepted, rejected, withdrawn)",
        "coverLetter": "Introduction text from applicant",
        "createdAt": "Application timestamp"
      },
      readers: ["Applicant", "Host Organization Representative", "Assigned Receptionist"],
      writers: ["Contributor (creation, withdrawal)", "Organization Representative (accept, reject)"]
    },
    activities: {
      name: "activities",
      purpose: "Central audit log tracking events (need submission, quest creation, outcome delivery) for timeline rendering.",
      owner: "System",
      relationships: ["Refers to organizationId or userId"],
      importantFields: {
        "title": "Action title",
        "description": "Text overview of the action",
        "type": "Event type (outcomeDelivered, needSubmitted, etc.)",
        "createdAt": "Action timestamp"
      },
      readers: ["All authenticated users", "Public (branch logs)"],
      writers: ["System (automatic triggers on state changes)"]
    }
  },
  workflows: {
    userRegistration: [
      "User creates account via Auth page using Firebase Auth.",
      "If user profile document does not exist, a new document is written to users collection with default Rank F and role 'member'.",
      "User goes through MemberOnboarding to update basic profile details, settings, and skills."
    ],
    organizationRegistration: [
      "User signs up selecting organization account track.",
      "Org profile created in pending status inside organizations collection.",
      "A notification is generated for Receptionists to vet the website and organization details.",
      "Vetted organizations are assigned a Guild Representative (Receptionist) and marked verified."
    ],
    needQuestOutcomeCycle: [
      "Organization posts a Need detailing project requirements.",
      "Receptionist reviews the Need and schedules scoping with the organization.",
      "Scoped Need is converted into one or many active Quests on the Quest Board.",
      "Quest deliverables are built, submitted, evaluated, and verified.",
      "Verified outcome generates a playbook record in the Knowledge Hub."
    ],
    questApprovalFlow: [
      "Contributor uploads submission link and writes outcome report.",
      "Quest status updates to 'underReview'.",
      "Organization Representative reviews the outcome and approves/requests revisions.",
      "Guild Representative reviews the outcome against specifications.",
      "Dual-signed outcome is pushed to production; XP and reputation are distributed."
    ],
    xpFlow: [
      "Once quest is marked verified, the contributor's XP is incremented by the quest's xpReward value.",
      "An activity ledger record is appended to user's activityHistory array.",
      "The change triggers a check for Rank promotion."
    ],
    rankProgression: [
      "System queries user's cumulative XP.",
      "System checks if the user meets additional requirements (e.g., minimum quests completed at a specific difficulty tier).",
      "Rank field is updated inside the user's Firestore document.",
      "A notification is sent to the member celebrating the rank promotion."
    ],
    passportUpdateFlow: [
      "Upon quest verification, a completed quest record (referencing quest title, outcomes, and organization) is appended to user's portfolio history.",
      "Verified skills from the quest are merged into the user's verified skills list.",
      "Member's Guild Passport metadata is rebuilt to display the updated metrics."
    ],
    notifications: [
      "Workflows invoke the `notifyUser` repository helper.",
      "A notification document is written containing payload details.",
      "The client dashboard displays active alerts instantly using real-time Firestore listeners."
    ],
    paymentFlow: [
      "Future: Organization deposits quest funding into escrow account.",
      "Platform confirms receipt of escrow deposit before activating the quest.",
      "Upon dual-verification verification step, funds are automatically distributed to the contributor (less platform maintenance fee)."
    ]
  },
  userJourneys: {
    memberJourney: [
      "Register account → complete onboarding profile → browse active branches → join regional or campus branch.",
      "Learn and read playbooks in the Knowledge Hub → select a development path (e.g. builder).",
      "Apply to active Quests on the board → get accepted → execute deliverables → submit proof of work.",
      "Earn XP and climb Ranks → verify Guild Passport → access premium and paid quest opportunities."
    ],
    organizationJourney: [
      "Register organization profile → contact assigned Receptionist → complete intake questionnaire.",
      "Post Need requests → wait for scoping conversion to active Quests.",
      "Select contributors from applicant list → track progress in Organization Dashboard.",
      "Review submission outputs → approve deliverables → build verified outcomes profile."
    ],
    receptionistJourney: [
      "Log in → view receptionist work queue → vet pending organization registrations.",
      "Review submitted needs → perform intake calls → convert Needs to active Quests.",
      "Coordinate between contributors and organizations to ensure frictionless quest execution."
    ],
    guildMasterJourney: [
      "Approve new regional branch applications → monitor state-level activity logs.",
      "Validate high-level university partnerships → audit platform coordination metrics."
    ],
    founderJourney: [
      "Review platform architecture integrity → configure fee parameters.",
      "Publish system development updates → lead core governance paths."
    ]
  },
  roles: {
    applicant: {
      name: "Applicant",
      purpose: "A prospective organization or individual applying to enter the Guild system.",
      responsibilities: ["Submit true information", "Complete intake registration forms", "Describe organizational structure or capabilities"],
      permissions: ["Access public pages", "Fill registration forms"],
      typicalWorkflow: ["Visit registration page", "Fill in details", "Wait for Receptionist vetting and onboarding approval"]
    },
    member: {
      name: "Member",
      purpose: "An onboarded individual in the Guild network.",
      responsibilities: ["Maintain accurate profile parameters", "Respect community guidelines", "Participate in local Branch activities"],
      permissions: ["Access member dashboard", "View Knowledge Hub", "Browse active branches", "Edit settings"],
      typicalWorkflow: ["Log in", "Check branch updates", "Browse playbooks in the Knowledge Hub", "Edit personal settings"]
    },
    contributor: {
      name: "Contributor",
      purpose: "An active builder, developer, or designer who claims and executes Quests.",
      responsibilities: ["Build to specification", "Submit high-quality deliverables", "Document Proof of Work", "Respect deadlines"],
      permissions: ["Browse active Quest Board", "Apply to Quests", "Submit Quest completions", "Ascend Ranks", "Earn XP"],
      typicalWorkflow: ["Browse Quest Board", "Apply for suitable Quest", "Claim Quest once assigned", "Build the solution", "Submit Proof of Work link/evidence", "Receive XP and reputation upon officer sign-off"]
    },
    receptionist: {
      name: "Receptionist",
      purpose: "A Guild officer managing incoming needs, onboarding organizations, and routing active Quests.",
      responsibilities: ["Vet incoming needs", "Onboard new organizations", "Map needs to Quest structures", "Manage work queue", "Serve as relationship managers"],
      permissions: ["Access receptionist work queue", "Assign Quests", "Approve organizational registrations", "Update trust levels"],
      typicalWorkflow: ["Review new organization signups", "Call or email org contacts", "Review submitted needs", "Approve needs and spawn Quests", "Assign receptionists to new accounts"]
    },
    guildRepresentative: {
      name: "Guild Representative",
      purpose: "A senior official validating deliverables, evaluating complex submissions, and managing dispute resolution.",
      responsibilities: ["Perform quality checks on Quest outcomes", "Audit claimed Proof of Work", "Manage disputes", "Moderate knowledge articles"],
      permissions: ["Approve/Reject Quest completion submissions", "Issue verification credentials", "Promote user Ranks"],
      typicalWorkflow: ["Check pending submissions queue", "Verify the link and deliverables against Quest specifications", "Verify organization approval status", "Approve submission to release XP and rewards"]
    },
    organizationRepresentative: {
      name: "Organization Representative",
      purpose: "A corporate, educational, or NGO partner representative managing their group's presence and needs.",
      responsibilities: ["Define clear organizational needs", "Evaluate contributor deliverables", "Approve Quest outcomes", "Maintain active website and contact info"],
      permissions: ["Access Organization Dashboard", "Submit Needs", "Evaluate submissions", "Edit organization settings"],
      typicalWorkflow: ["Post organizational Need", "Onboard with Receptionist", "Approve contributor applications for spawned Quests", "Review delivered submissions", "Mark submissions as approved to trigger Guild validation"]
    },
    guildMasters: {
      name: "Guild Masters",
      purpose: "Regional coordinators or domain directors managing branches and state levels.",
      responsibilities: ["Coordinate multiple regional branches", "Onboard major educational or government partners", "Appoint Guild Representatives"],
      permissions: ["Access regional metrics", "Configure regional branch parameters", "Create new local branch instances"],
      typicalWorkflow: ["Monitor branch activity charts", "Onboard college campus representatives", "Establish state-wide guild coordination pipelines"]
    },
    founder: {
      name: "Founder",
      purpose: "The creators and architects of the Guild platform and network core.",
      responsibilities: ["Define core architecture", "Set system protocols", "Manage platform treasury", "Direct future roadmap"],
      permissions: ["Global system overrides", "Configure system parameters", "Access developer settings"],
      typicalWorkflow: ["Review system integration points", "Adjust platform fee configurations", "Deploy software protocol updates"]
    }
  },
  business: {
    targetAudience: [
      "College students needing real-world project portfolios.",
      "Self-taught developers and career changers needing proof-of-capability.",
      "NGOs requiring technical execution on volunteer budgets.",
      "Mid-sized businesses requiring audited talent matching."
    ],
    valueProposition: "Deploy projects to a structured talent network with zero evaluation noise, verified by professional officers, paying only for successfully delivered outcomes.",
    usp: "An unalterable, double-loop verified reputation ledger where talent is proven through documented deliverables, not self-reported CV claims.",
    competitors: [
      "Upwork & Fiverr (low trust, transaction-oriented fee models)",
      "LinkedIn (unverified self-reported resumes)",
      "Turing & Toptal (closed-source, agency-styled matching)",
      "Traditional Universities (expensive, outdated credential systems)"
    ],
    whyGuildWins: "By reducing transaction trust costs to near-zero via verified ledgers and structured officer-mediated workflows, Guild delivers higher quality outcomes at a fraction of recruiting overhead."
  },
  marketing: {
    thirtySecondExplanation: "Guild replaces resumes with proof. Organizations post real needs, contributors claim them as structured Quests, and Guild Officers verify the output. Successful completions write directly to the contributor's Guild Passport, creating an unalterable record of true capability.",
    twoMinuteExplanation: "In a world flooded by resume inflation and AI-generated portfolios, traditional credentialing is broken. Guild is a civilization-oriented reputation network that restores trust. We structure project requirements into clear Quests. Contributor work is evaluated via a double-loop verification system: first approved by the client organization, then audited by a Guild Representative. Verified outcomes earn XP and build a permanent, public, peer-reviewed Guild Passport. It is a win-win: organizations get work done with zero transaction noise, and builders earn verified credentials that speak louder than any degree.",
    elevatorPitch: "A decentralized reputation network replacing unverified resumes with proof of work, verified by institutional sign-off and platform officers.",
    faq: {
      "How is Guild different from freelancing?": "Freelance sites are bidding wars based on self-marketing. Guild is a career reputation ledger where tasks are structured, payouts are secure, and your achievements build a globally legible Rank.",
      "What is a Guild Representative?": "A Guild Representative is an appointed officer who audits deliverables to ensure platform evaluation quality stays high and unbiased."
    }
  },
  legal: {
    termsClarification: {
      "Founder Pass": "The Founder Pass is a digital membership and access key. It does not represent stock, equity, debt, or financial returns in Guild or associated entities.",
      "Guild Passport": "A public profile ledger showing verified contributions. It is not an employment contract, work permit, or background check.",
      "Guild Rank": "An indicator of platform experience and milestone achievements. It does not correlate to external employment grades or salary guarantees.",
      "XP": "A reward metric of work volume. It has no cash value and cannot be exchanged, traded, or cashed out."
    },
    disclaimers: [
      "Quests do not establish an employer-employee relationship between the contributor and Guild or the host organization.",
      "Members are solely responsible for local tax and reporting obligations arising from payments."
    ]
  },
  roadmap: {
    alreadyBuilt: [
      "Multi-tab Account Settings with integrated Organization settings tab.",
      "Need intake system mapping to active Quest Board structures.",
      "Visual Guild Card with QR validation layouts.",
      "Double-loop Quest evaluation workflow (Organization accept + Guild Rep validation).",
      "Dynamic SEO metadata routing and centralized SEO manager configuration.",
      "Receptionist work queues and onboarding communication links."
    ],
    inProgress: [
      "Branch details page with regional leadership directories.",
      "Dispute escalation modal forms for Quest deliverables.",
      "Real-time chat channels for active Quest workspaces."
    ],
    planned: [
      "Founder Pass NFT credentials with governance structures.",
      "Knowledge Hub playbooks auto-generation from verified quest repositories.",
      "Mobile passport application for QR check-ins at regional hubs."
    ],
    ideas: [
      "AI Scoping assistant that automatically converts organization needs into granular Quests.",
      "Decentralized reputation staking pools to secure contractor delivery."
    ]
  },
  decisionLog: [
    {
      title: "Guild Passport vs Traditional CV",
      reason: "Traditional CVs are unverified and prone to exaggeration. The Passport enforces objectivity by displaying only double-verified contributions tied directly to a transaction ledger."
    },
    {
      title: "Double-Loop Verification",
      reason: "Having only organizations approve work creates a risk of collusive reviews or varying quality standards. A neutral Guild Representative acting as a secondary verification officer secures the overall ecosystem standards."
    },
    {
      title: "No Direct SQL or Firebase queries in components",
      reason: "To ensure that all data writes create matching audit logs and trigger correct notifications, all database calls must reside inside the centralized Repository pattern."
    }
  ],
  aiGuidance: {
    beforeChangingCode: [
      "Read this file first to understand terminology boundaries.",
      "Check `repository.ts` for existing functions before implementing custom Firestore queries.",
      "Always include target SEO configuration inside `PAGE_SEO` rather than writing manual Title updates.",
      "Confirm that organization pages support both basic fields and the newly introduced Industry sector."
    ],
    refactoringRules: [
      "Keep existing documentation strings and comments intact unless updating logic.",
      "Do not split centralized repository files into fragmented modules unless it exceeds limits.",
      "Maintain strict TypeScript types on all returned data models."
    ],
    verificationGuidelines: [
      "Always run `npx tsc --noEmit` and `npm run build` after editing to ensure build integrity.",
      "Test both contributor and organization roles when modifying workflow structures."
    ]
  },
  neverDo: [
    "Never duplicate Firestore collections or create parallel user registries.",
    "Never rename Guild terminology to generic terms (e.g., do not call a Quest a 'Job' or a 'Gig').",
    "Never bypass the double-loop verification workflow for quest completion actions.",
    "Never expose private user coordinates (such as email or phone) on public-facing profiles.",
    "Never write ad-hoc Firestore write queries in components; always route through the Repository pattern."
  ],
  featureStatus: {
    guildPassport: "production",
    guildCard: "production",
    questBoard: "production",
    settingsPage: "production",
    founderPass: "planned",
    marketplace: "planned",
    payments: "foundation-ready"
  },
  futureExtensionPoints: [
    {
      system: "Payments Escrow System",
      description: "Escrow account system holding funds before contributor claims are processed.",
      recommendedPattern: "Integrate stateless webhook listeners inside the repository payment transaction handlers."
    },
    {
      system: "AI Scoping Service",
      description: "An AI-powered service that turns organizational Needs into multiple active Quests.",
      recommendedPattern: "Create a stateless helper function inside `src/lib/repository.ts` that maps JSON response payloads directly to Needs/Quests schema rules."
    }
  ]
};
