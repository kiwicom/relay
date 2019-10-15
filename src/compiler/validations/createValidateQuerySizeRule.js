// @flow

import { sprintf } from '@kiwicom/js';
import { ConsoleReporter } from 'relay-compiler';
import { type ValidationContext, type OperationDefinitionNode } from 'graphql';
import calculate, { THRESHOLD } from '@kiwicom/graphql-result-size';

export default function createValidateQuerySizeRule(reporter: ConsoleReporter) {
  // Please note: these validations are being executed BEFORE Relay transforms take place!
  return function validateQuerySizeRule(validationContext: ValidationContext) {
    const schema = validationContext.getSchema();
    return {
      OperationDefinition(node: OperationDefinitionNode) {
        // We collect all relevant fragments for each operation and calculate the relevant score (how to do it better?).
        const fragmentDefinitions = [];
        for (const fragmentDefinition of collectFragments(node)) {
          fragmentDefinitions.push(fragmentDefinition);
        }
        try {
          const score = calculate(schema, {
            // fake `DocumentNode`
            kind: 'Document',
            definitions: [node, ...fragmentDefinitions],
          });
          if (score < THRESHOLD * 0.5) {
            reporter.reportMessage(
              sprintf('💚 %s (score %s)', node.name?.value ?? '<anonymous operation>', score),
            );
          } else {
            reporter.reportMessage(
              sprintf(
                '🧡 %s (score %s, threshold %s)',
                node.name?.value ?? '<anonymous operation>',
                score,
                THRESHOLD,
              ),
            );
          }
        } catch {
          reporter.reportMessage(
            sprintf(
              '💔 %s - this operation could return too big result (threshold %s was reached)',
              node.name?.value ?? '???',
              THRESHOLD,
            ),
          );
        }
      },
    };

    // This function should get all the fragments from specified operation definition recursively.
    function* collectFragments(node) {
      const spreadNodes = validationContext.getFragmentSpreads(node.selectionSet);
      if (spreadNodes.length === 0) {
        return;
      }
      for (const spreadNode of spreadNodes) {
        const spreadName = spreadNode.name.value;
        const spreadFragment = validationContext.getFragment(spreadName);
        if (spreadFragment) {
          yield spreadFragment;
          yield* collectFragments(spreadFragment);
        }
      }
    }
  };
}
