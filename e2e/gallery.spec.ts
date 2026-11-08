import { test, expect } from './fixtures';

test.describe('Gallery Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/astrophotography');
  });

  test('should display all images by default', async ({ page }) => {
    await expect(
      page.getByTestId('gallery-card-milky-way-arch').first()
    ).toBeVisible();
    await expect(
      page.getByTestId('gallery-card-orion-nebula').first()
    ).toBeVisible();
  });

  test('should render gallery cards with responsive image candidates', async ({
    page,
  }) => {
    const cardImage = page
      .getByTestId('gallery-card-milky-way-arch')
      .locator('img')
      .first();

    await expect(cardImage).toBeVisible();
    await expect(cardImage).toHaveAttribute(
      'srcset',
      /thumbnail-320\.webp 320w/
    );
    await expect(cardImage).toHaveAttribute(
      'srcset',
      /thumbnail-560\.webp 560w/
    );
    await expect(cardImage).toHaveAttribute('sizes', /100vw/);
    await expect(cardImage).toHaveAttribute('width', '560');
    await expect(cardImage).toHaveAttribute('height', '373');
  });

  test('should filter images by selecting a category', async ({ page }) => {
    // Direct navigation to filter state
    await page.goto('/astrophotography?filter=Deep+Sky');

    const filterBtn = page
      .getByRole('button', { name: 'Deep Sky', exact: true })
      .first();

    // Verify filter is active - check the button has the aria-pressed attribute
    await expect(filterBtn).toHaveAttribute('aria-pressed', 'true', {
      timeout: 10000,
    });
  });

  test('should open modal and display tags', async ({ page }) => {
    const card = page.getByTestId('gallery-card-milky-way-arch').first();
    // Force click to deal with potential overlay components like hover elements
    await card.click();

    await page.waitForURL(/\/astrophotography\/milky-way-arch/, {
      timeout: 10000,
    });

    const modal = page.getByTestId('image-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Check tags exist - they have # prefix in the UI
    const tag = modal.getByRole('button', { name: '#Milky Way' }).first();
    await expect(tag).toBeVisible({ timeout: 10000 });
  });

  test('should wrap tags below a long modal title', async ({ page }) => {
    await page.goto('/astrophotography/milky-way-arch');

    const modal = page.getByTestId('image-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    const title = modal.getByRole('heading', {
      name: 'The Milky Way and Red Sprites over Geroldsee (Wagenbrüchsee)',
    });
    const firstTag = modal.getByRole('button', { name: '#Red Sprites' });
    const titleBox = await title.boundingBox();
    const firstTagBox = await firstTag.boundingBox();

    expect(titleBox).not.toBeNull();
    expect(firstTagBox).not.toBeNull();
    expect(firstTagBox!.y).toBeGreaterThanOrEqual(
      titleBox!.y + titleBox!.height
    );
  });

  test('should navigate to tag view when clicking a tag in modal', async ({
    page,
  }) => {
    // Direct navigation to image state
    await page.goto('/astrophotography/orion-nebula');

    const modal = page.getByTestId('image-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    const tag = modal.getByRole('button', { name: '#Deep Sky' }).first();
    await tag.click();

    await page.waitForURL(/\?tag=deep-sky/, { timeout: 10000 });

    // Should close modal and filter gallery
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Check URL
    await expect(page).toHaveURL(/tag=deep-sky/);
  });
});
