// @flow

import { ConsoleReporter } from 'relay-compiler';
import { findDeprecatedUsages, type DocumentNode, type ValidationContext } from 'graphql';
import { sprintf } from '@kiwicom/js';

export default function createValidateDeprecatedUsagesRule(reporter: ConsoleReporter) {
  return function validateDeprecatedUsagesRule(validationContext: ValidationContext) {
    const schema = validationContext.getSchema();
    return {
      Document(node: DocumentNode): void {
        const deprecatedUsages = findDeprecatedUsages(schema, node);
        const errors = new Map(); // [error message, number of occurrences]
        deprecatedUsages.forEach(({ message }) => {
          if (errors.has(message)) {
            errors.set(message, errors.get(message) + 1);
          } else {
            errors.set(message, 1);
          }
        });
        errors.forEach((occurrences, errorMessage) => {
          reporter.reportMessage(sprintf('💔 %sx %s', occurrences, errorMessage));
        });
      },
    };
  };
}
