import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { Button } from '@/components/ui';
import { renderWithProviders } from '../support/render';

describe('Button', () => {
  it('renders its label', () => {
    renderWithProviders(<Button>Book session</Button>);
    expect(screen.getByRole('button', { name: 'Book session' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    renderWithProviders(<Button onClick={onClick}>Book session</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Book session' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button onClick={onClick} disabled>
        Book session
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Book session' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
