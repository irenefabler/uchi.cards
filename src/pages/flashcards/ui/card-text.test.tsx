import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { CardText } from './card-text';

afterEach(cleanup);
it('renders mixed text, powers and fractions as safe MathML', () => {
  const { container } = render(<CardText text={'Раскрой скобки: \\((a+b)^2\\), затем \\(\\frac{a_1}{b}\\)'} />);
  expect(container.querySelectorAll('math')).toHaveLength(2);
  expect(container.querySelector('msup')).toBeTruthy();
  expect(container.querySelector('mfrac')).toBeTruthy();
  expect(container.querySelector('msub')).toBeTruthy();
  expect(container.textContent).toContain('Раскрой скобки');
});
it('keeps unsupported math visible with a warning and never injects HTML', () => {
  const { container } = render(<CardText text={'<img src=x onerror=alert(1)> \\(\\unknown{x}\\)'} />);
  expect(container.querySelector('img')).toBeNull();
  expect(screen.getByText('Проверь формулу')).toBeTruthy();
  expect(container.textContent).toContain('\\unknown');
});
it('keeps legacy plain text and chemical subscripts', () => {
  const { container } = render(<CardText text="Вода — H₂O" />);
  expect(container.textContent).toBe('Вода — H₂O');
});
