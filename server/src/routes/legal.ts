import { Router, type Request, type Response } from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const legalRouter = Router();

function serveLegalPage(fileName: string, fallbackTitle: string) {
  return (_req: Request, res: Response) => {
    // Server is started from /server, so project root is one level up
    const projectRoot = join(process.cwd(), '..');
    const filePath = join(projectRoot, 'docs', fileName);

    if (existsSync(filePath)) {
      const html = readFileSync(filePath, 'utf-8');
      res.type('html').send(html);
    } else {
      res.type('html').send(`
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><title>${fallbackTitle} - Apex Live</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>body{font-family:system-ui,sans-serif;max-width:700px;margin:2rem auto;padding:0 1rem;color:#333;line-height:1.6}</style>
        </head>
        <body>
          <h1>${fallbackTitle}</h1>
          <p>This page is being prepared. Please contact <a href="mailto:support@apexlive.app">support@apexlive.app</a> for details.</p>
        </body>
        </html>
      `);
    }
  };
}

legalRouter.get('/privacy', serveLegalPage('privacy-policy.html', 'Privacy Policy'));
legalRouter.get('/terms', serveLegalPage('terms-of-service.html', 'Terms of Service'));
