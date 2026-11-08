import { test, expect } from './fixtures';

test.describe('Travel Highlights Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the travel page (needs country, place, and date slugs)
    await page.goto('/travel/poland/krakow/2024-05-10');
  });

  test('should display the travel highlights content', async ({ page }) => {
    // Check main title (Country)
    await expect(
      page.getByRole('heading', { name: 'Krakow, Poland' }).first()
    ).toBeVisible();

    // Check subtitle (backend highlight_title; the "Exploring the cosmic wonders" fallback only applies without one)
    await expect(page.getByText('A Week in Krakow').first()).toBeVisible();

    // Check story title
    await expect(page.getByText('Krakow Trip').first()).toBeVisible();

    // Check story content
    await expect(
      page.getByText('Full story of the Krakow trip.').first()
    ).toBeVisible();
  });

  test('should display image cards with correct specifications', async ({
    page,
  }) => {
    // Check if the title exists as a heading
    await expect(
      page.getByRole('heading', { name: 'Orion Nebula' }).first()
    ).toBeVisible();

    // Check description
    await expect(
      page.getByText('Description of the Orion Nebula').first()
    ).toBeVisible();
  });

  test('should open modal when clicking an image', async ({ page }) => {
    const image = page.getByTestId('gallery-card-orion-nebula').first();
    await image.click();

    await page.waitForURL(/\?img=/, { timeout: 10000 });

    // Check modal
    const modal = page.getByTestId('image-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(
      modal.getByRole('heading', { name: 'Orion Nebula' })
    ).toBeVisible();
  });
});
