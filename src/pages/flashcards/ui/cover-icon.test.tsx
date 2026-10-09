import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { CoverIcon, coverOptions, iconManifest } from './cover-icon';

afterEach(cleanup);
it('resolves unsafe or reward IDs to the neutral cover', () => {
  for (const id of ['../../etc/passwd', '<script>', 'award-badge', 'camera-photo']) {
    const { container, unmount } = render(<CoverIcon id={id} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(iconManifest['flashcards-leaf']);
    unmount();
  }
});
it('bundles twenty individual icons and reserves ten thematic covers', () => {
  expect(Object.keys(iconManifest)).toHaveLength(20);
  expect(coverOptions).toHaveLength(10);
  const { container } = render(<CoverIcon id="plant-leaves" />);
  const image = container.querySelector('img');
  expect(image?.getAttribute('src')).toBe(iconManifest['plant-leaves']);
  expect(image?.getAttribute('alt')).toBe('');
  expect(image?.getAttribute('width')).toBe('512');
});
