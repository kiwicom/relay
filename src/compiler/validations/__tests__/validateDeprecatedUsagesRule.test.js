// @flow

import os from 'os';
import path from 'path';
import { parse, validate } from 'graphql';
import { ConsoleReporter } from 'relay-compiler';
import { generateTestsFromFixtures } from '@kiwicom/test-utils';

import testSchema from './testSchema';
import createValidateDeprecatedUsagesRule from '../createValidateDeprecatedUsagesRule';

generateTestsFromFixtures(path.join(__dirname, 'fixtures', 'findDeprecatedUsagesRule'), query => {
  const documentAST = parse(query);
  const reporter = new ConsoleReporter({ quiet: true });
  const spy = jest.spyOn(reporter, 'reportMessage');
  const validateDeprecatedUsagesRule = createValidateDeprecatedUsagesRule(reporter);
  validate(testSchema, documentAST, [validateDeprecatedUsagesRule]);
  // $FlowIssue: https://github.com/facebook/flow/issues/7397
  const spyCalls = spy.mock.calls.flat(Infinity);
  return spyCalls.length === 0 ? 'PASSED ✅' : spyCalls.join(os.EOL);
});
