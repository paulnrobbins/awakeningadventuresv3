import Link from 'next/link';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/sections/Footer';

export const metadata = {
  title: 'Credits',
  description:
    'Open-source 3D models and other creative work used on the Awakening Adventures site.',
};

type Attribution = {
  file: string;
  title: string;
  author: string;
  source: string;
  license: string;
  license_url: string;
  credit_line: string;
  notes?: string;
};

type AttributionsFile = {
  models: Attribution[];
};

/**
 * Reads the ATTRIBUTIONS.json file at BUILD TIME (force-static) so the
 * credit lines are baked into the static page rather than fetched at
 * runtime. CC-BY 4.0 requires public attribution; this is where it
 * lives.
 *
 * The fetch-sketchfab-model.mjs script appends to ATTRIBUTIONS.json
 * every time a new model is pulled, so adding a credit is automatic.
 * Refresh by running `npm run build`.
 */
async function loadAttributions(): Promise<Attribution[]> {
  try {
    const filePath = join(process.cwd(), 'public', 'models', 'ATTRIBUTIONS.json');
    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as AttributionsFile;
    return data.models ?? [];
  } catch {
    return [];
  }
}

export default async function CreditsPage() {
  const attributions = await loadAttributions();

  return (
    <>
      <Nav />
      <main className="scene">
        <header className="max-w-[68rem]">
          <p className="eyebrow text-cream/55 mb-4">Credits</p>
          <h1 className="font-display text-display text-cream leading-[0.95]">
            Thank you to the open-source creators.
          </h1>
          <p className="editorial mt-8 text-cream">
            Several 3D models on this site come from generous community
            contributors who shared their work under{' '}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-amber"
            >
              Creative Commons Attribution 4.0
            </a>
            . Their names, the models, and links to their original work
            are below.
          </p>
        </header>

        <section className="mt-16 max-w-[68rem]">
          <h2 className="font-display text-title text-cream mb-8">3D models</h2>

          {attributions.length === 0 ? (
            <p className="font-sans text-body text-cream/85">
              No external 3D models in use yet. (The site currently ships on
              procedural primitives only.)
            </p>
          ) : (
            <ul className="divide-y divide-cream/15 border-t border-b border-cream/15 list-none m-0 p-0">
              {attributions.map((m) => (
                <li key={m.file} className="py-6">
                  <p className="font-display text-lede text-cream leading-tight">
                    {m.title}
                  </p>
                  <p className="font-sans text-body text-cream/85 mt-2">
                    by{' '}
                    <span className="text-cream">{m.author}</span>
                    {' — '}
                    <a
                      href={m.license_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4 hover:text-amber"
                    >
                      {m.license.replace('-4.0', ' 4.0').replace('CC-BY', 'CC BY')}
                    </a>
                  </p>
                  <p className="font-sans text-caption text-cream/70 mt-2">
                    <a
                      href={m.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4 hover:text-amber"
                    >
                      View original on Sketchfab →
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-16 max-w-[68rem]">
          <h2 className="font-display text-title text-cream mb-6">
            Site built by
          </h2>
          <p className="editorial text-cream">
            Awakening Adventures website by{' '}
            <a
              href="https://kingdomdigitalservices.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-amber"
            >
              Kingdom Digital Services
            </a>
            . Property hosted by Anthony &amp; Barb in Grandview, Tennessee.
          </p>
        </section>

        <section className="mt-16">
          <Link href="/" className="cta-primary inline-flex">
            Back to the property
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
