import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { Input } from '@/components/ui';
import { renderWithProviders } from '../support/render';

describe('Input', () => {
  it('renders its label', () => {
    renderWithProviders(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows the error message when given an error', () => {
    renderWithProviders(<Input label="Email" error="Enter a valid email address" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address');
  });

  it('does not show an error message when none is given', () => {
    renderWithProviders(<Input label="Email" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('forwards typed value to the input', async () => {
    renderWithProviders(<Input label="Email" />);

    const input = screen.getByLabelText('Email');
    await userEvent.type(input, 'jane@example.com');

    expect(input).toHaveValue('jane@example.com');
  });
});
