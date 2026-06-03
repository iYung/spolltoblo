import React from 'react'
import { render, screen } from '@testing-library/react'
import Footer from '../../components/Footer.jsx'

describe('Footer', () => {
  it('renders the fan content disclaimer text', () => {
    render(<Footer />)
    expect(screen.getByText(/unofficial Fan Content/i)).toBeInTheDocument()
    expect(screen.getByText(/Not approved\/endorsed by Wizards/i)).toBeInTheDocument()
    expect(screen.getByText(/Wizards of the Coast LLC/i)).toBeInTheDocument()
  })

  it('renders a link to the WotC Fan Content Policy', () => {
    render(<Footer />)
    const link = screen.getByRole('link', { name: /fan content policy/i })
    expect(link).toHaveAttribute('href', 'https://company.wizards.com/en/legal/fancontentpolicy')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
