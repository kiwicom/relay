// @flow

import createEnvironment from './createEnvironment';
import createNetworkFetcher from './fetchers/createNetworkFetcher';

module.exports = createEnvironment({
  fetcherFn: createNetworkFetcher('https://graphql.kiwi.com'),
});
