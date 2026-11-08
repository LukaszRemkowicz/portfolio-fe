import { test, expect } from './fixtures';

const PROJECT_OWNER = process.env.PROJECT_OWNER || 'Portfolio Owner';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the hero section with correct title', async ({
    page,
  }) => {
    const title = page.locator('h1').first();
    await expect(title).toContainText('The Beauty of');
    await expect(title).toContainText('Ancient Light.');
  });

  test('should navigate to gallery and back', async ({ page }) => {
    await page.click('text=View Portfolio');
    await expect(page).toHaveURL(/\/astrophotography/);
    await expect(page.locator('h1').first()).toContainText('Gallery');

    await page.click(`nav a:has-text("${PROJECT_OWNER}")`);
    await expect(page).toHaveURL('/');
  });

  test('should open image modal in gallery', async ({ page }) => {
    // Wait for the container to ensure data is loaded
    // Wait for the heading to ensure data is loaded and section is rendered
    // Broader search for the heading
    const heading = page.getByRole('heading', { name: /Latest images/i });

    await expect(heading).toBeVisible({ timeout: 20000 });

    // Target explicit data-testid for the first card
    const firstImage = page.getByTestId('gallery-card-orion-nebula').first();

    await expect(firstImage).toBeVisible({ timeout: 10000 });
    // Force click since the image might be behind an overlay or animating
    await firstImage.click({ force: true });

    const modal = page.getByTestId('image-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('should submit contact form', async ({ page }) => {
    // Use more robust selector and longer timeout for lazy loaded component
    const contactHeading = page.getByRole('heading', {
      name: /Direct Inquiry/i,
    });
    await expect(contactHeading).toBeVisible({ timeout: 15000 });
    await contactHeading.scrollIntoViewIfNeeded();

    await page.fill('#contact input[name="name"]', 'Test User', {
      force: true,
    });
    await page.fill('#contact input[name="email"]', 'test@example.com', {
      force: true,
    });
    await page.fill('#contact input[name="subject"]', 'Test Subject', {
      force: true,
    });
    await page.fill(
      '#contact textarea[name="message"]',
      'This is a test message longer than 10 chars.',
      { force: true }
    );

    await page.click('#contact button[type="submit"]');

    await expect(
      page.locator('text=Thank you! Your message has been sent successfully.')
    ).toBeVisible();
  });
});
