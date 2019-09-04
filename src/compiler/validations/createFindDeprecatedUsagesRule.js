// @flow strict

import { findDeprecatedUsages, type DocumentNode, type ValidationContext } from 'graphql';
import { warning } from '@kiwicom/js';

export default function createFindDeprecatedUsagesRule(throwErrors: boolean = true) {
  return function findDeprecatedUsagesRule(validationContext: ValidationContext) {
    const schema = validationContext.getSchema();
    return {
      Document(node: DocumentNode): void {
        const deprecatedUsages = findDeprecatedUsages(schema, node);
        deprecatedUsages.forEach(error => {
          if (throwErrors) {
            throw error;
          } else {
            warning(false, '! %s', error.message);
          }
        });
      },
    };
  };
}
