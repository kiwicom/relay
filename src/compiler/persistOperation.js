// @flow

import logger from '@kiwicom/logger';

import graphql from '../graphql';
import commitMutation from '../commitMutation';
import createEnvironment from '../createEnvironment';
import createNetworkFetcher from '../fetchers/createNetworkFetcher';

/**
 * This mutation persist operations to our GraphQL Persistent Storage for
 * later direct usage. Update the Relay generated files whith this command:
 *
 * yw @kiwicom/relay relay-compiler --src=./src/compiler --schema=../../incubator/graphql.kiwi.com.schema.gql
 */
export default function persistOperation(operationId: string, text: string) {
  return commitMutation(
    createEnvironment({
      logger: false,
      fetchFn: createNetworkFetcher('https://graphql.kiwi.com/', {
        'X-Client': 'Kiwi.com Relay Compiler',
      }),
    }),
    {
      mutation: graphql`
        mutation persistOperationMutation($input: [StoredOperationInput!]!) {
          createStoredOperations(persistedOperations: $input) {
            createdOperations {
              operationId
              text
            }
          }
        }
      `,
      variables: {
        input: { operationId, text },
      },
      onError: error => {
        logger.error('TODO: onError', String(error));
        process.exitCode = 1;
      },
      onCompleted: (response, errors) => {
        logger.error('TODO: onCompleted', String(JSON.stringify(response)), String(errors));
        process.exitCode = 2;
      },
    },
  );
}
