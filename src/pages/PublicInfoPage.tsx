import { Link, useLocation } from 'react-router-dom';
import SEO, { PAGE_SEO } from '../components/SEO';
import { Mail, Phone, ArrowRight } from 'lucide-react';

type InfoSection = {
  title: string;
  body: string;
  items?: string[];
};

type InfoPageContent = {
  title: string;
  summary: string;
  sections: InfoSection[];
  action?: { label: string; to: string };
};

const pages: Record<string, InfoPageContent> = {
  about: {
    title: 'About Guild',
    summary: 'Guild connects capable members, organizations, and local Guild operators through verified quests, outcomes, and public proof of work.',
    sections: [
      {
        title: 'What Guild Does',
        body: 'Guild helps organizations turn real needs into structured work, then helps members build capability through practical quests and reviewed submissions.'
      },
      {
        title: 'How We Work',
        body: 'Each organization is connected with a relationship manager, each need follows a review workflow, and each completed contribution can become a verified outcome.'
      }
    ],
    action: { label: 'Partner With Us', to: '/org-register' }
  },
  contact: {
    title: 'Contact Us',
    summary: 'Connect with The Central Guild for organization partnerships, member support, public inquiries, and operational questions.',
    sections: [
      {
        title: 'Get In Touch',
        body: 'We\'re here to help with your questions and support needs. Reach out via email or phone during business hours.'
      },
      {
        title: 'Email',
        body: 'thecentralguild@gmail.com - Send us your account email, organization name if applicable, and a clear description of your inquiry.'
      },
      {
        title: 'Phone',
        body: '+1 (917) 626-9138 - Call us for urgent matters, account support, or partnership opportunities.'
      },
      {
        title: 'Response Standard',
        body: 'Urgent account and active quest issues are prioritized within 24 hours. General inquiries and partnership requests are reviewed by our team and responded to within 2-3 business days.'
      },
      {
        title: 'What to Include',
        body: 'Please provide screenshots when relevant, the affected quest or need link, the action you were trying to complete, and your preferred contact method for follow-up.'
      }
    ]
  },
  support: {
    title: 'Support',
    summary: 'Support exists to keep quests, organization relationships, and member records moving cleanly.',
    sections: [
      {
        title: 'Common Support Areas',
        body: 'Guild support can help with account access, organization registration, quest applications, submissions, profile visibility, and notification issues.'
      },
      {
        title: 'Before You Write',
        body: 'Include screenshots when useful, the affected quest or need link, and the action you expected to complete.'
      }
    ]
  },
  faq: {
    title: 'FAQ',
    summary: 'Short answers for members and organizations evaluating Guild.',
    sections: [
      {
        title: 'For Organizations',
        body: 'Organizations register, submit needs, work with a relationship manager, and track progress through needs, quests, messages, and outcomes.'
      },
      {
        title: 'For Members',
        body: 'Members build a profile, apply to quests, submit work, receive review, and grow a public record of verified contribution.'
      },
      {
        title: 'Verification',
        body: 'Verification is based on reviewed submissions, organization confirmation, and Guild operator checks where appropriate.'
      }
    ]
  },
  refund: {
    title: 'Refund & Cancellation Policy',
    summary: 'Guild is prepared for paid workflows while keeping current public workflows clear.',
    sections: [
      {
        title: 'Current Platform Status',
        body: 'If a paid workflow is active for your account or organization, refund and cancellation handling follows the written agreement connected to that quest or service.'
      },
      {
        title: 'Review Process',
        body: 'Refund or cancellation requests are reviewed against delivery status, accepted scope, evidence submitted, and any applicable organization agreement.'
      }
    ]
  },
  cookies: {
    title: 'Cookie Policy',
    summary: 'Guild uses essential browser storage to keep the product usable and secure.',
    sections: [
      {
        title: 'Essential Storage',
        body: 'Guild may use cookies, local storage, and Firebase session mechanisms for authentication, theme preference, routing, and product reliability.'
      },
      {
        title: 'Analytics',
        body: 'If analytics are enabled, they should be used to improve platform performance and product quality, not to sell personal information.'
      }
    ]
  },
  disclaimer: {
    title: 'Disclaimer',
    summary: 'Guild coordinates work and verification, but it does not replace professional, legal, financial, or employment advice.',
    sections: [
      {
        title: 'Platform Role',
        body: 'Guild provides tools for discovery, coordination, review, and proof of work. Organizations and members remain responsible for their decisions and commitments.'
      },
      {
        title: 'No Guaranteed Outcome',
        body: 'Guild works to improve trust and execution quality, but no platform can guarantee hiring, revenue, completion, or acceptance of every quest.'
      }
    ]
  },
  careers: {
    title: 'Careers',
    summary: 'Guild is building a network of operators, reviewers, technologists, and community leaders.',
    sections: [
      {
        title: 'Future Roles',
        body: 'Future openings may include Guild operations, relationship management, engineering, design, moderation, and regional growth roles.'
      },
      {
        title: 'How to Prepare',
        body: 'Build a strong Guild Passport, complete meaningful quests, and document the kind of work you want to be trusted with.'
      }
    ]
  },
  press: {
    title: 'Press & Media',
    summary: 'Public information for journalists, partners, and community storytellers.',
    sections: [
      {
        title: 'Media Inquiries',
        body: 'For interviews, partnership stories, or public references, contact support@guild.example with Press in the subject line.'
      },
      {
        title: 'Public Positioning',
        body: 'Guild is a capability and quest platform for verified work, organization needs, and member growth records.'
      }
    ]
  },
  brand: {
    title: 'Brand Assets',
    summary: 'Use Guild brand references carefully and consistently.',
    sections: [
      {
        title: 'Logo Use',
        body: 'Use the Guild name and logo only when accurately referring to the platform, an official Guild page, or an approved partnership.'
      },
      {
        title: 'Partner Mentions',
        body: 'Organizations should not imply endorsement beyond their actual Guild relationship status or published profile.'
      }
    ]
  }
};

export default function PublicInfoPage() {
  const slug = useLocation().pathname.replace('/', '') || 'about';
  const page = pages[slug] || pages.about;
  const isContactPage = slug === 'contact';

  return (
    <>
      <SEO {...PAGE_SEO.home} />
      <div className="page-shell max-w-4xl mx-auto py-12 px-6">
        <div className="mb-8">
          <p className="eyebrow">Guild Trust Center</p>
          <h1 className="text-3xl font-black tracking-tight">{page.title}</h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">{page.summary}</p>
        </div>

        {isContactPage && (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {/* Email Contact Card */}
            <a href="mailto:thecentralguild@gmail.com" className="group panel p-6 rounded-2xl hover:bg-[var(--card-hover)] transition-colors cursor-pointer border border-[var(--border-subtle)] hover:border-[var(--primary)]">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-[var(--primary)]/10 group-hover:bg-[var(--primary)]/20 transition-colors">
                  <Mail className="w-6 h-6 text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base mb-1">Email</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">thecentralguild@gmail.com</p>
                  <span className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1 group-hover:gap-2 transition-all">
                    Send Email <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </a>

            {/* Phone Contact Card */}
            <a href="tel:+19176269138" className="group panel p-6 rounded-2xl hover:bg-[var(--card-hover)] transition-colors cursor-pointer border border-[var(--border-subtle)] hover:border-[var(--primary)]">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-[var(--primary)]/10 group-hover:bg-[var(--primary)]/20 transition-colors">
                  <Phone className="w-6 h-6 text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base mb-1">Phone</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">+1 (917) 626-9138</p>
                  <span className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1 group-hover:gap-2 transition-all">
                    Call Us <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </a>
          </div>
        )}

        <div className="grid gap-4">
          {page.sections.map((section) => (
            <section key={section.title} className="panel p-5">
              <h2 className="text-base font-bold mb-2">{section.title}</h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{section.body}</p>
              {section.items && (
                <ul className="mt-3 list-disc pl-5 text-sm text-[var(--text-secondary)] space-y-1">
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        {page.action && (
          <Link to={page.action.to} className="primary inline-flex mt-6 px-4 py-2 rounded-xl text-sm font-bold">
            {page.action.label}
          </Link>
        )}
      </div>
    </>
  );
}
