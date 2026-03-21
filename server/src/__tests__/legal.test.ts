/**
 * Integration tests for the legal routes.
 * Tests run against the live server at localhost:3001.
 */

const API = 'http://localhost:3001';

describe('Legal Routes', () => {
  it('GET /legal/privacy returns HTML with 200', async () => {
    const res = await fetch(`${API}/legal/privacy`);

    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type');
    expect(contentType).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('Privacy Policy');
  });

  it('GET /legal/terms returns HTML with 200', async () => {
    const res = await fetch(`${API}/legal/terms`);

    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type');
    expect(contentType).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('Terms of Service');
  });

  it('GET /legal/privacy returns valid HTML document', async () => {
    const res = await fetch(`${API}/legal/privacy`);
    const html = await res.text();

    // Should be a proper HTML document
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('GET /legal/terms returns valid HTML document', async () => {
    const res = await fetch(`${API}/legal/terms`);
    const html = await res.text();

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('legal endpoints do not require authentication', async () => {
    // No Authorization header sent
    const privacyRes = await fetch(`${API}/legal/privacy`);
    expect(privacyRes.status).toBe(200);

    const termsRes = await fetch(`${API}/legal/terms`);
    expect(termsRes.status).toBe(200);
  });

  it('GET /legal/privacy contains the page title in the HTML body', async () => {
    const res = await fetch(`${API}/legal/privacy`);
    const html = await res.text();

    // The title should appear either in a <title> tag or an <h1>
    const hasTitleTag = html.includes('<title>') && html.toLowerCase().includes('privacy');
    const hasH1 = html.toLowerCase().includes('privacy policy');
    expect(hasTitleTag || hasH1).toBe(true);
  });

  it('GET /legal/terms contains the page title in the HTML body', async () => {
    const res = await fetch(`${API}/legal/terms`);
    const html = await res.text();

    const hasTitleTag = html.includes('<title>') && html.toLowerCase().includes('terms');
    const hasH1 = html.toLowerCase().includes('terms of service');
    expect(hasTitleTag || hasH1).toBe(true);
  });
});
