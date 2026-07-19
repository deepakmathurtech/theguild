import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import LegalPolicyPage from './LegalPolicyPage';

describe('LegalPolicyPage', () => {
  it('renders the policy title and section content', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <LegalPolicyPage
          title="Terms of Service"
          summary="The rules that govern using Guild."
          sections={[
            {
              title: 'Eligibility',
              body: 'Users must be at least 18 years old to create an account.',
            },
          ]}
        />
      </MemoryRouter>
    );

    expect(markup).toContain('Terms of Service');
    expect(markup).toContain('Eligibility');
    expect(markup).toContain('Users must be at least 18 years old to create an account.');
  });
});
