describe('Genesis Student App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should show login screen after launch', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();
  });

  it('should have email input', async () => {
    await expect(element(by.id('email-input'))).toBeVisible();
  });

  it('should show error on invalid login', async () => {
    await element(by.id('email-input')).typeText('invalid@test.com');
    await element(by.id('password-input')).typeText('wrong');
    await element(by.id('login-button')).tap();
    await expect(element(by.id('error-message'))).toBeVisible();
  });
});
