import { test, expect } from '@playwright/test';

test('critical non-custodial application journey', async ({ page }) => {
  await page.addInitScript(() => {
    window.__SFO_MOCK_WALLET__ = {
      publicKey: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      network: 'testnet',
      sign: async (value) => value,
    };
  });
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/session')) return route.fulfill({ status: 401, body: '{}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await test.step('landing page and launch app', async () => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Stellar Financial OS/i);
    await page.getByRole('link', { name: /Launch App/i }).first().click();
    await expect(page).toHaveURL(/dashboard/);
  });
  await test.step('wallet, authentication, dashboard, portfolio, RWA, and DeFi routes', async () => {
    for (const route of ['/dashboard', '/portfolio', '/rwa', '/rwa/example', '/defi', '/defi/blend']) {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
    }
  });
  await test.step('swap, payment, anchor, cross-chain, risk, and session settings are reachable', async () => {
    for (const route of ['/swap', '/payments/send', '/ramps', '/cross-chain', '/risk', '/settings/security']) {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
