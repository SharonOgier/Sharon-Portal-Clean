import { test, expect } from '@playwright/test';

test('verify compliance dashboard as farmer', async ({ page }) => {
  // Mock auth and profile
  await page.addInitScript(() => {
    const mockProfile = {
      businessName: "Test Farm",
      businessType: "farmer",
      setupComplete: true,
      subscriptionTier: "pro"
    };
    window.localStorage.setItem('sas_profile', JSON.stringify(mockProfile));

    // Mock user
    const mockUser = {
      id: 'test-user-id',
      email: 'farmer@example.com',
      user_metadata: { needs_setup: false }
    };
    // This depends on how SharonPortalWebsite handles session,
    // but usually there's some localStorage for supabase.
  });

  // Navigate to portal
  await page.goto('http://localhost:5173/');

  // Wait for dashboard to load
  await page.waitForSelector('text=Compliance Status');
  await page.screenshot({ path: 'verify_dashboard_compliance.png' });

  // Click on Compliance Status section to go to the dashboard
  await page.click('text=Compliance Status');

  // Wait for Compliance Dashboard page
  await page.waitForSelector('text=Compliance Dashboard');
  await page.screenshot({ path: 'verify_compliance_page.png' });

  // Check for specific elements
  await expect(page.locator('text=Chemical Status')).toBeVisible();
  await expect(page.locator('text=Livestock Status')).toBeVisible();
  await expect(page.locator('text=NLIS Sale Status')).toBeVisible();
  await expect(page.locator('text=Compliance Audit Trail')).toBeVisible();
});
