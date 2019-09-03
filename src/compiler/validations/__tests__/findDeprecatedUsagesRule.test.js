// @flow

import path from 'path';
import { parse, validate } from 'graphql';
import { generateTestsFromFixtures } from '@kiwicom/test-utils';

import testSchema from './testSchema';
import createFindDeprecatedUsagesRule from '../createFindDeprecatedUsagesRule';

generateTestsFromFixtures(path.join(__dirname, 'fixtures', 'findDeprecatedUsagesRule'), query => {
  const documentAST = parse(query);
  const findDeprecatedUsagesRule = createFindDeprecatedUsagesRule(true);
  const errors = validate(testSchema, documentAST, [findDeprecatedUsagesRule]);
  return errors.length === 0 ? 'PASSED ✅' : errors;
});
