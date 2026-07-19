import LegalPolicyPage from '../components/legal/LegalPolicyPage';

export function TermsPage() {
  return (
    <LegalPolicyPage
      title="Terms of Service"
      summary="These terms define how members and organizations may use Guild across quests, events, and public profiles."
      sections={[
        {
          title: 'Eligibility',
          body: 'You must be at least 18 years old and capable of entering into a legally binding agreement under Indian law to use Guild. Organizations must be represented by an authorized signatory.'
        },
        {
          title: 'Account Responsibilities',
          body: 'Each account holder is responsible for keeping login credentials secure and for all activity conducted through the account. Guild may suspend access where necessary to protect the platform from fraud or misuse.'
        },
        {
          title: 'Platform Use',
          body: 'Guild operates as a public coordination and trust platform. It is not the organizer of quests or events unless expressly stated, and users remain responsible for their own conduct and commitments.'
        },
        {
          title: 'Payments and Events',
          body: 'Where payment is involved, the related organization or service provider handles the offer, pricing, refund conditions, and event delivery. Guild may facilitate payments through third-party processors.'
        },
        {
          title: 'Termination',
          body: 'Guild may restrict or terminate accounts that violate these terms, community standards, or applicable law. Continued use after termination is not permitted.'
        }
      ]}
      footer={<span>Last updated: {new Date().toLocaleDateString()}</span>}
    />
  );
}

export function PrivacyPage() {
  return (
    <LegalPolicyPage
      title="Privacy Policy"
      summary="Guild processes personal and organizational data to support authentication, trust, communication, and safe product delivery."
      sections={[
        {
          title: 'Information We Collect',
          body: 'We collect account information, profile details, verification inputs, quest and event activity data, messages, and payment-related information where applicable.'
        },
        {
          title: 'How We Use Data',
          body: 'Guild uses this data to create accounts, enable participation, match members with opportunities, keep records, prevent abuse, and improve platform reliability.'
        },
        {
          title: 'Sharing and Disclosure',
          body: 'We do not sell personal information. We may share information with service providers, payment processors, and verified organizations when necessary to operate the platform or fulfill a request you make.'
        },
        {
          title: 'Security',
          body: 'Guild uses industry-standard security controls and access restrictions for sensitive information, but no system can guarantee absolute protection.'
        },
        {
          title: 'Your Rights',
          body: 'You can access, correct, or request deletion of your account data where applicable through the platform settings or a support request.'
        }
      ]}
      footer={<span>Last updated: {new Date().toLocaleDateString()}</span>}
    />
  );
}

export function CommunityPage() {
  return (
    <LegalPolicyPage
      title="Community Guidelines"
      summary="These guidelines support a respectful, useful, and trustworthy environment for all Guild members."
      sections={[
        {
          title: 'Respect and Integrity',
          body: 'Members must treat others with professionalism, truthfulness, and courtesy. Misrepresentation, harassment, intimidation, or abuse is not allowed.'
        },
        {
          title: 'Quality Participation',
          body: 'Work should be completed in good faith, submitted with honesty, and documented clearly so reviewers and organizations can evaluate it fairly.'
        },
        {
          title: 'Safety and Compliance',
          body: 'Any content or conduct that violates law, harms others, or attempts to exploit the system may be removed and reported to the relevant authorities.'
        },
        {
          title: 'Enforcement',
          body: 'Guild may issue warnings, restrict access, remove content, or suspend an account where policy violations are detected.'
        }
      ]}
      footer={<span>Last updated: {new Date().toLocaleDateString()}</span>}
    />
  );
}

export function RefundPage() {
  return (
    <LegalPolicyPage
      title="Refund & Cancellation Policy"
      summary="Refund and cancellation requests are reviewed in line with the payment terms of the relevant quest, event, or service."
      sections={[
        {
          title: 'When Refunds May Apply',
          body: 'Refund requests may be considered for cancellations, service failures, or delivery issues, depending on the status of the booking, payment, and event or quest terms.'
        },
        {
          title: 'Review Process',
          body: 'Guild will evaluate refund requests based on evidence, delivery status, timing, and the applicable organization terms. Decisions may take several business days.'
        },
        {
          title: 'Non-Refundable Situations',
          body: 'Where a service has been fully provided, a booking is confirmed and used, or a request is made outside the applicable policy window, refunds may be declined.'
        }
      ]}
      footer={<span>Last updated: {new Date().toLocaleDateString()}</span>}
    />
  );
}

export function PaymentCommissionPage() {
  return (
    <LegalPolicyPage
      title="Payment & Commission Policy"
      summary="Guild may charge a platform commission on payments processed through the platform and may use third-party providers for settlement."
      sections={[
        {
          title: 'Platform Charges',
          body: 'The applicable commission and fee structure will be disclosed at the time of booking, listing, or payment collection. Charges may vary by service type and transaction volume.'
        },
        {
          title: 'Payment Processing',
          body: 'Payments are processed through approved third-party gateways. Guild is not the bank or lender and is not responsible for gateway failures outside its reasonable control.'
        },
        {
          title: 'Tax and Compliance',
          body: 'Users and organizations are responsible for complying with applicable tax and reporting obligations related to payments received or made through the platform.'
        }
      ]}
      footer={<span>Last updated: {new Date().toLocaleDateString()}</span>}
    />
  );
}

export function PayoutPage() {
  return (
    <LegalPolicyPage
      title="Payout Policy"
      summary="Guild may hold funds temporarily before releasing them to the appropriate party as part of the platform workflow."
      sections={[
        {
          title: 'Settlement Timing',
          body: 'Payouts may be delayed while verification, review, or compliance checks are pending. The exact timeline depends on the workflow and governing agreement.'
        },
        {
          title: 'Distribution',
          body: 'Funds are released to the designated recipient after the applicable review and settlement process is completed, subject to the terms of the platform and any payment provider requirements.'
        },
        {
          title: 'Exceptions',
          body: 'If a dispute, chargeback, or compliance issue is ongoing, Guild may pause or reverse a payout while the matter is investigated.'
        }
      ]}
      footer={<span>Last updated: {new Date().toLocaleDateString()}</span>}
    />
  );
}

export function DisputeResolutionPage() {
  return (
    <LegalPolicyPage
      title="Dispute Resolution Policy"
      summary="Guild provides a structured pathway for resolving disagreements involving accounts, payments, work quality, or event participation."
      sections={[
        {
          title: 'Initial Resolution',
          body: 'Users and organizations should first raise concerns through the platform support channels with evidence and a clear description of the issue.'
        },
        {
          title: 'Escalation',
          body: 'If the issue cannot be resolved directly, the matter may be escalated to Guild operations for review. Guild may request additional context before deciding.'
        },
        {
          title: 'Jurisdiction',
          body: 'Any unresolved dispute will be handled in accordance with applicable Indian law and the governing forum described in the relevant agreement or platform terms.'
        }
      ]}
      footer={<span>Last updated: {new Date().toLocaleDateString()}</span>}
    />
  );
}

export function ProhibitedActivitiesPage() {
  return (
    <LegalPolicyPage
      title="Prohibited Activities Policy"
      summary="Guild prohibits conduct that harms trust, safety, fairness, or the integrity of the platform."
      sections={[
        {
          title: 'Prohibited Behavior',
          body: 'Spam, impersonation, fake accounts, fraud, unauthorized scraping, plagiarism, harassment, payment abuse, and deceptive listings are not permitted.'
        },
        {
          title: 'Consequences',
          body: 'Violations may lead to content removal, account restrictions, loss of reputation, refunds reversal, or legal reporting where appropriate.'
        },
        {
          title: 'Reporting',
          body: 'Members and organizations can report suspected misuse through the support or grievance channels so Guild can investigate.'
        }
      ]}
      footer={<span>Last updated: {new Date().toLocaleDateString()}</span>}
    />
  );
}

export function IntellectualPropertyPage() {
  return (
    <LegalPolicyPage
      title="Intellectual Property Policy"
      summary="Guild respects rights and expects users and organizations to do the same when publishing content or completing work."
      sections={[
        {
          title: 'User Content',
          body: 'Users retain ownership of content they create and upload, unless they expressly agree to assign or license it to an organization or Guild as part of a specific arrangement.'
        },
        {
          title: 'Platform Content',
          body: 'Guild owns the platform brand, interface elements, designs, system content, and documentation unless otherwise stated.'
        },
        {
          title: 'Violation Handling',
          body: 'Guild may remove infringing content, suspend accounts, or pursue remedies where required to protect rights and comply with law.'
        }
      ]}
      footer={<span>Last updated: {new Date().toLocaleDateString()}</span>}
    />
  );
}

export function GrievancePage() {
  return (
    <LegalPolicyPage
      title="Grievance Redressal Policy"
      summary="Guild provides a formal channel for concerns about privacy, payments, safety, moderation, or platform operations."
      sections={[
        {
          title: 'How to Raise a Grievance',
          body: 'A grievance can be raised through the support channel with your account details, a description of the issue, relevant links, and any supporting evidence.'
        },
        {
          title: 'Acknowledgement',
          body: 'Guild will acknowledge the complaint and assess it within a reasonable period based on the nature and urgency of the issue.'
        },
        {
          title: 'Resolution',
          body: 'Guild may request additional information, investigate the matter, and communicate a resolution or next steps through the available support channels.'
        }
      ]}
      footer={<span>Last updated: {new Date().toLocaleDateString()}</span>}
      action={{ label: 'Submit a grievance', to: '/grievance-form' }}
    />
  );
}

export function CookiePage() {
  return (
    <LegalPolicyPage
      title="Cookie Policy"
      summary="Guild uses browser storage and cookies to keep the service functional, secure, and personalized."
      sections={[
        {
          title: 'What We Use',
          body: 'The platform uses essential cookies and local storage for authentication, session continuity, theme preference, and performance monitoring.'
        },
        {
          title: 'Your Choices',
          body: 'You may manage browser settings to block or delete cookies, though doing so may reduce some functionality or require reauthentication.'
        },
        {
          title: 'Third Parties',
          body: 'Some analytics or service integrations may use their own cookies or tracking technologies subject to their own policies.'
        }
      ]}
      footer={<span>Last updated: {new Date().toLocaleDateString()}</span>}
      action={{ label: 'Back to legal center', to: '/legal' }}
    />
  );
}

export function VerificationPolicyPage() {
  return (
    <LegalPolicyPage
      title="Organization Verification Policy"
      summary="Verification helps establish that an organization is real, accountable, and prepared to use Guild responsibly."
      sections={[
        {
          title: 'Verification Process',
          body: 'Guild may request organization details, identity proof, contact validation, and supporting documentation before granting or maintaining a verified status.'
        },
        {
          title: 'Purpose',
          body: 'Verification helps reduce fraud, improve trust, and make it easier for members to evaluate organizations and opportunities.'
        },
        {
          title: 'Ongoing Obligations',
          body: 'Verified organizations must keep their information accurate and cooperate with any follow-up review request from Guild.'
        }
      ]}
      footer={<span>Last updated: {new Date().toLocaleDateString()}</span>}
    />
  );
}
