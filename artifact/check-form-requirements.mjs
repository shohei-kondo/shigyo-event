import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const free = read('src/pages/forms/free-consultation.astro');
const venue = read('src/pages/forms/venue-support.astro');
const script = read('src/pages/forms/script-support.astro');
const gas = read('gas/Code.gs');

const allForms = [
  ['free consultation', free],
  ['venue support', venue],
  ['script support', script],
];

for (const [label, source] of allForms) {
  assert(
    !source.includes('name="profession_type"'),
    `${label}: 士業・団体種別 field should be removed`
  );
  assert(
    !source.includes('professionTypeOptions'),
    `${label}: professionTypeOptions import should be removed`
  );
}

assert(
  !gas.includes('士業・団体種別が未入力です。'),
  'GAS should not require professionType after removing the field'
);

assert(
  !free.includes("import RadioGroup"),
  'free consultation: radio group should not be needed'
);
assert(
  !free.includes('consultMethodOptions'),
  'free consultation: old consult method options should not be used'
);
assert(
  free.includes('onlineConsultConfirmationOptions'),
  'free consultation: should use online-only confirmation options'
);
assert(
  venue.includes('onlineConsultConfirmationOptions'),
  'venue support: should use online interview confirmation options'
);
assert(
  script.includes('onlineConsultConfirmationOptions'),
  'script support: should use online interview confirmation options'
);
assert(
  /export const onlineConsultConfirmationOptions: string\[\] = \['オンラインでの初回面談であることを確認しました'\];/m.test(
    read('src/data/forms.ts')
  ),
  'shared form options: online interview confirmation text should match approved wording'
);

for (const [label, source] of allForms) {
  assert(
    /<CheckboxGroup\s+name="consult_method"\s+legend="初回面談の実施方法"\s+options={onlineConsultConfirmationOptions}\s+required\s*\/>/m.test(
      source
    ),
    `${label}: consult method should be a required online interview confirmation checkbox`
  );
}

for (const fieldName of ['attendees', 'budget', 'venue_style']) {
  const fieldPattern = new RegExp(
    `<SelectField\\s+name="${fieldName}"[^>]*required`,
    'm'
  );
  assert(
    !fieldPattern.test(venue),
    `venue support: ${fieldName} should not be required`
  );
}

assert(
  !script.includes('name="plan_game"'),
  'script support: plan_game question should be removed'
);
assert(
  !script.includes('planGameOptions'),
  'script support: planGameOptions should not be imported or used'
);
assert(
  script.includes('name="program_other"') &&
    script.includes('label="入れたい進行（その他）"'),
  'script support: should include a free-input その他 field for program'
);

console.log('form requirements check passed');
