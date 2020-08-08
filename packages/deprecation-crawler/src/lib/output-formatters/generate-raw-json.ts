import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CrawlConfig, Deprecation } from '../models';
import { ensureDirExists } from '../utils';

export async function generateRawJson(
  config: CrawlConfig,
  rawDeprecations: Deprecation[],
  options: { tagDate: string }
): Promise<void> {
  if (rawDeprecations.length === 0) {
    console.log(
      '🎉 All deprecations are resolved, no raw JSON has to be generated'
    );
    return;
  }

  console.log('📝 Regenerating raw JSON');

  ensureDirExists(config.outputDirectory);

  let existingData;
  try {
    const t = readFileSync(
      join(config.outputDirectory, `${config.gitTag}.json`)
    );
    existingData = JSON.parse(t as any);
  } catch (e) {
    existingData = false;
  }
  let content;
  if (existingData) {
    content = {
      ...existingData,
      deprecations: upsertDeprecations(
        existingData.deprecations,
        rawDeprecations
      ),
    };
  } else {
    content = {
      version: config.gitTag,
      date: options.tagDate,
      deprecations: rawDeprecations,
    };
  }

  const json = JSON.stringify(content, null, 4);
  const path = join(config.outputDirectory, `${config.gitTag}.json`);
  writeFileSync(path, json);

  console.log(`📝 Raw JSON data up to date under ${path}`);
}

function upsertDeprecations(
  existingDeprecations: Deprecation[],
  newDeprecations: Deprecation[]
): Deprecation[] {
  const upsertedDeprecations = [...existingDeprecations];
  newDeprecations.forEach((newDeprecation) =>
    upsertDeprecation(upsertedDeprecations, newDeprecation)
  );
  return upsertedDeprecations;
}

function upsertDeprecation(
  existingDeprecations: Deprecation[],
  deprecationToUpsert: Deprecation
) {
  const i = existingDeprecations.findIndex(
    (_deprecation) =>
      deprecationToUpsert.path + deprecationToUpsert.lineNumber ===
      _deprecation.path + _deprecation.lineNumber
  );
  if (i > -1) existingDeprecations[i] = deprecationToUpsert;
  else existingDeprecations.push(deprecationToUpsert);
}