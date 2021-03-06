import {
  CrawlConfig,
  CrawledRelease,
  CrawlerProcess,
  Deprecation,
} from '../models';
import { concat, tap } from '../utils';
import { crawlDeprecations, getSourceFiles } from '../crawler';
import { addRuid } from '../tasks/add-ruid';
import {
  printFooterLine,
  printHeadline,
  printProgress,
  ProcessFeedback,
} from '../log';
import * as kleur from 'kleur';

const feedback = getCrawlFeedback();

/**
 * Look for deprecations
 * Adds the deprecations to the release
 */
export function crawl(config: CrawlConfig): CrawlerProcess {
  return concat([
    tap(
      async (r): Promise<CrawledRelease> => {
        feedback.printStart(config, r);
        return r;
      }
    ),
    async (r): Promise<CrawledRelease> => {
      const deprecations = await crawlDeprecations(config, r);
      return {
        ...r,
        deprecations,
      };
    },
    addRuid(config),
    tap(
      async (r): Promise<CrawledRelease> => {
        feedback.printEnd(config, r);
        return r;
      }
    ),
  ]);
}

function getCrawlFeedback(): ProcessFeedback {
  let existingDeprecations: Deprecation[] = [];
  return {
    printStart(config: CrawlConfig, r: CrawledRelease): void {
      existingDeprecations = r?.deprecations || [];

      printHeadline('CRAWL PHASE');
      console.log(
        kleur.gray(`🔎 Looking for deprecations in: `),
        kleur.black(`${r.tag}`)
      );
      console.log(kleur.gray(`Date: ${r.date}`));
      printProgress();
    },

    async printEnd(
      config: CrawlConfig,
      rawRelease: CrawledRelease
    ): Promise<void> {
      const files = await getSourceFiles(config);
      const existingRuids = existingDeprecations.map((d) => d.ruid);
      const newDeprecations = rawRelease.deprecations.filter(
        (d) => !existingRuids.includes(d.ruid)
      );
      console.log(
        kleur.green('✓ '),
        kleur.gray(`Found `),
        kleur.black(`${newDeprecations.length}`),
        kleur.gray(` deprecations in `),
        kleur.gray(files.length),
        kleur.gray(` files.`)
      );
      printFooterLine();
    },
  };
}
