import { test, expect, type Response } from '@playwright/test';

test.describe('Game Listing and Navigation', () => {
  test('should display games with titles on index page', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
    });

    await test.step('Verify games grid is visible', async () => {
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Verify game cards are displayed', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first()).toBeVisible();
      expect(await gameCards.count()).toBeGreaterThan(0);
    });

    await test.step('Verify game cards have titles with content', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first().getByTestId('game-title')).toBeVisible();
      await expect(gameCards.first().getByTestId('game-title')).not.toBeEmpty();
    });
  });

  test('should navigate to correct game details page when clicking on a game', async ({ page }) => {
    let gameId: string | null;
    let gameTitle: string | null;

    await test.step('Navigate to homepage and wait for games to load', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Get first game information and click it', async () => {
      const firstGameCard = page.getByTestId('game-card').first();
      gameId = await firstGameCard.getAttribute('data-game-id');
      gameTitle = await firstGameCard.getAttribute('data-game-title');
      await firstGameCard.click();
    });

    await test.step('Verify navigation to game details page', async () => {
      await expect(page).toHaveURL(`/game/${gameId}`);
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title matches clicked game', async () => {
      if (gameTitle) {
        await expect(page.getByTestId('game-details-title')).toHaveText(gameTitle);
      }
    });
  });

  test('should display game details with all required information', async ({ page }) => {
    await test.step('Navigate to specific game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title is displayed', async () => {
      const gameTitle = page.getByTestId('game-details-title');
      await expect(gameTitle).toBeVisible();
      await expect(gameTitle).not.toBeEmpty();
    });

    await test.step('Verify game description is displayed', async () => {
      const gameDescription = page.getByTestId('game-details-description');
      await expect(gameDescription).toBeVisible();
      await expect(gameDescription).not.toBeEmpty();
    });

    await test.step('Verify publisher or category information is present', async () => {
      const publisherExists = await page.getByTestId('game-details-publisher').isVisible();
      const categoryExists = await page.getByTestId('game-details-category').isVisible();
      expect(publisherExists || categoryExists).toBeTruthy();

      if (publisherExists) {
        await expect(page.getByTestId('game-details-publisher')).not.toBeEmpty();
      }

      if (categoryExists) {
        await expect(page.getByTestId('game-details-category')).not.toBeEmpty();
      }
    });
  });

  test('should display a button to back the game', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify back game button is visible and enabled', async () => {
      const backButton = page.getByTestId('back-game-button');
      await expect(backButton).toBeVisible();
      await expect(backButton).toContainText('Support This Game');
      await expect(backButton).toBeEnabled();
    });
  });

  test('should be able to navigate back to home from game details', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Click back to all games link', async () => {
      const backLink = page.getByRole('link', { name: /back to all games/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
    });

    await test.step('Verify navigation back to homepage', async () => {
      await expect(page).toHaveURL('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();
    });
  });

  test('should return a 404 page for a non-existent game', async ({ page }) => {
    let response: Response | null;

    await test.step('Navigate to non-existent game', async () => {
      response = await page.goto('/game/99999');
    });

    await test.step('Verify a branded 404 page is served', async () => {
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(/Page Not Found - Tailspin Toys/);
      await expect(page.getByTestId('not-found')).toBeVisible();
      await expect(page.getByTestId('not-found-heading')).not.toBeEmpty();
      await expect(page.getByTestId('not-found-home-link')).toBeVisible();
    });
  });

  test.describe('Game Filtering', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await expect(page.getByTestId('filter-controls')).toBeVisible();
    });

    test('displays filter controls with categories and publishers', async ({ page }) => {
      await test.step('Verify filter controls exist', async () => {
        await expect(page.getByTestId('filter-controls')).toBeVisible();
        await expect(page.getByRole('heading', { name: /Filter Games/i })).toBeVisible();
      });

      await test.step('Verify category checkboxes are present', async () => {
        const categoryCheckboxes = page.locator('input[data-filter-type="category"]');
        const count = await categoryCheckboxes.count();
        expect(count).toBeGreaterThan(0);
      });

      await test.step('Verify publisher checkboxes are present', async () => {
        const publisherCheckboxes = page.locator('input[data-filter-type="publisher"]');
        const count = await publisherCheckboxes.count();
        expect(count).toBeGreaterThan(0);
      });
    });

    test('filters games by single category', async ({ page }) => {
      await test.step('Click first category checkbox', async () => {
        await page.locator('input[data-filter-type="category"]').first().click();
      });

      await test.step('Verify URL contains category filter and games are filtered', async () => {
        await expect(page).toHaveURL(/\?category=\d+/);
        await expect(page.getByTestId('games-grid')).toBeVisible();
      });
    });

    test('filters games by multiple categories', async ({ page }) => {
      await test.step('Click first two category checkboxes', async () => {
        const categoryCheckboxes = page.locator('input[data-filter-type="category"]');
        const count = await categoryCheckboxes.count();
        if (count >= 2) {
          await categoryCheckboxes.nth(0).click();
          await categoryCheckboxes.nth(1).click();
        }
      });

      await test.step('Verify URL contains both category filters', async () => {
        await expect(page).toHaveURL(/\?category=\d+&category=\d+/);
        await expect(page.getByTestId('games-grid')).toBeVisible();
      });
    });

    test('filters games by single publisher', async ({ page }) => {
      await test.step('Click first publisher checkbox', async () => {
        await page.locator('input[data-filter-type="publisher"]').first().click();
      });

      await test.step('Verify URL contains publisher filter and games are filtered', async () => {
        await expect(page).toHaveURL(/\?publisher=\d+/);
        await expect(page.getByTestId('games-grid')).toBeVisible();
      });
    });

    test('filters games by multiple publishers', async ({ page }) => {
      await test.step('Click first two publisher checkboxes', async () => {
        const publisherCheckboxes = page.locator('input[data-filter-type="publisher"]');
        const count = await publisherCheckboxes.count();
        if (count >= 2) {
          await publisherCheckboxes.nth(0).click();
          await publisherCheckboxes.nth(1).click();
        }
      });

      await test.step('Verify URL contains both publisher filters', async () => {
        await expect(page).toHaveURL(/\?publisher=\d+&publisher=\d+/);
        await expect(page.getByTestId('games-grid')).toBeVisible();
      });
    });

    test('combines category and publisher filters', async ({ page }) => {
      await test.step('Click first category and first publisher checkbox', async () => {
        const firstCategory = page.locator('input[data-filter-type="category"]').first();
        const firstPublisher = page.locator('input[data-filter-type="publisher"]').first();
        await firstCategory.click();
        await firstPublisher.click();
      });

      await test.step('Verify URL contains both category and publisher filters', async () => {
        await expect(page).toHaveURL(/\?category=\d+&publisher=\d+/);
        await expect(page.getByTestId('games-grid')).toBeVisible();
      });
    });

    test('clear filters button removes all filters', async ({ page }) => {
      await test.step('Apply a filter', async () => {
        await page.locator('input[data-filter-type="category"]').first().click();
        await expect(page).toHaveURL(/\?category=\d+/);
      });

      await test.step('Click clear filters button', async () => {
        await expect(page.getByTestId('clear-filters-button')).toBeVisible();
        await page.getByTestId('clear-filters-button').click();
      });

      await test.step('Verify all filters are cleared', async () => {
        await expect(page).toHaveURL('/');
        await expect(page.getByTestId('clear-filters-button')).not.toBeVisible();
      });
    });

    test('category filter checkboxes are keyboard navigable', async ({ page }) => {
      await test.step('Tab to first category checkbox and verify focus', async () => {
        const firstCheckbox = page.locator('input[data-filter-type="category"]').first();
        await page.keyboard.press('Tab');
        // Keep tabbing until we hit the first category checkbox
        let focused = await page.evaluate(() => document.activeElement?.getAttribute('id'));
        while (focused !== (await firstCheckbox.getAttribute('id'))) {
          await page.keyboard.press('Tab');
          focused = await page.evaluate(() => document.activeElement?.getAttribute('id'));
        }
        // Verify focus ring is visible
        const isFocused = await firstCheckbox.evaluate((el: HTMLInputElement) => {
          const style = window.getComputedStyle(el);
          return style.outline !== 'none' || el === document.activeElement;
        });
        expect(isFocused).toBe(true);
      });
    });

    test('displays empty state when no games match filters', async ({ page }) => {
      await test.step('Navigate with non-matching filters', async () => {
        // Try to navigate with category=999 and publisher=999 (non-existent IDs)
        await page.goto('/?category=999&publisher=999');
      });

      await test.step('Verify empty state message is displayed', async () => {
        await expect(page.getByText(/No games match your filters/i)).toBeVisible();
      });
    });
  });
});
